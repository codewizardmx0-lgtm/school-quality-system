/**
 * frontend-prototype/app.js
 * التطبيق التفاعلي الرئيسي لنموذج الواجهات (الشرائح 1-3).
 * يعتمد على Vanilla JavaScript و Fetch API للاتصال المباشر بـ Laravel API.
 */

const App = {
  state: {
    apiUrl: 'http://127.0.0.1:8000/api/v1',
    token: localStorage.getItem('eval_token') || null,
    user: JSON.parse(localStorage.getItem('eval_user') || 'null'),
    evaluations: [],
    currentEvaluation: null,
    standardsTree: null,
    currentIndicator: null,
    currentResult: null,
    currentEvidences: [],
    suggestions: [],
    plans: [],
    currentPlan: null,
    improvementAreas: [],
    currentScreen: 'login',
  },

  // ---------------------------------------------------------------------------
  // 1. التهيئة الأولية (Initialization)
  // ---------------------------------------------------------------------------
  init() {
    const apiInput = document.getElementById('api-url-input');
    if (apiInput) {
      apiInput.value = this.state.apiUrl;
      apiInput.addEventListener('change', (e) => {
        this.state.apiUrl = e.target.value.trim().replace(/\/+$/, '');
      });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.handleLogout());
    }

    if (this.state.token && this.state.user) {
      this.updateUserNav();
      this.navTo('cycles');
    } else {
      this.navTo('login');
    }
  },

  // ---------------------------------------------------------------------------
  // 2. طلبات الشبكة (HTTP Requests Helper)
  // ---------------------------------------------------------------------------
  async request(endpoint, options = {}) {
    const url = `${this.state.apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = options.headers || {};

    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }

    if (!options.isFormData) {
      headers['Accept'] = 'application/json';
      if (!headers['Content-Type'] && options.body) {
        headers['Content-Type'] = 'application/json';
      }
    } else {
      headers['Accept'] = 'application/json';
    }

    const config = {
      method: options.method || 'GET',
      headers: headers,
    };

    if (options.body) {
      config.body = options.isFormData ? options.body : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          data: data,
          message: data?.message || `خطأ في الطلب (${response.status})`,
          errors: data?.errors || null,
        };
      }

      return {
        ok: true,
        status: response.status,
        data: data?.data ?? data,
        meta: data?.meta ?? null,
        message: data?.message ?? null,
      };
    } catch (err) {
      console.error('Network error:', err);
      return {
        ok: false,
        status: 0,
        message: 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الـ API.',
        errors: null,
      };
    }
  },

  // ---------------------------------------------------------------------------
  // 3. التنبيهات وإدارة الشاشات (Navigation & Alerts)
  // ---------------------------------------------------------------------------
  showAlert(message, type = 'info', timeout = 5000) {
    const alertBox = document.getElementById('global-alert');
    if (!alertBox) return;

    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');

    if (timeout > 0) {
      setTimeout(() => {
        alertBox.classList.add('hidden');
      }, timeout);
    }
  },

  hideAlert() {
    const alertBox = document.getElementById('global-alert');
    if (alertBox) alertBox.classList.add('hidden');
  },

  navTo(screenName) {
    const screens = [
      'login',
      'cycles',
      'standards-tree',
      'suggestions',
      'plans',
    ];

    screens.forEach((s) => {
      const el = document.getElementById(`screen-${s}`);
      if (el) el.classList.add('hidden');
    });

    const targetEl = document.getElementById(`screen-${screenName}`);
    if (targetEl) targetEl.classList.remove('hidden');

    this.state.currentScreen = screenName;
    this.updateBreadcrumbs(screenName);

    // تحميل البيانات التلقائي حسب الشاشة
    if (screenName === 'cycles') {
      this.loadEvaluations();
    } else if (screenName === 'standards-tree' && this.state.currentEvaluation) {
      this.loadStandardsTree(this.state.currentEvaluation.evaluationId);
    } else if (screenName === 'suggestions' && this.state.currentEvaluation) {
      this.loadSuggestions();
    } else if (screenName === 'plans') {
      this.loadPlans();
    }
  },

  updateBreadcrumbs(screen) {
    const bc = document.getElementById('breadcrumbs');
    if (!bc) return;

    if (screen === 'login' || !this.state.user) {
      bc.classList.add('hidden');
      return;
    }

    bc.classList.remove('hidden');
    const bcTree = document.getElementById('bc-tree');
    const bcSugg = document.getElementById('bc-suggestions');
    const bcPlans = document.getElementById('bc-plans');

    if (bcTree) bcTree.style.display = this.state.currentEvaluation ? 'inline' : 'none';
    if (bcSugg) bcSugg.style.display = this.state.currentEvaluation ? 'inline' : 'none';
  },

  updateUserNav() {
    const badge = document.getElementById('user-badge');
    if (!badge) return;

    if (!this.state.user) {
      badge.classList.add('hidden');
      return;
    }

    badge.classList.remove('hidden');
    document.getElementById('user-name').textContent = this.state.user.fullName || this.state.user.username;
    document.getElementById('user-school').textContent = this.state.user.school?.schoolName || 'مدرسة غير محددة';
    
    // استخراج المسمى من كائن الدور القادم مباشرة من الـ API (حقل description أو roleName)
    const primaryRole = this.state.user.roles?.[0];
    const roleTitle = primaryRole?.description || primaryRole?.roleName || this.state.user.userType;
    document.getElementById('user-role').textContent = roleTitle;
  },

  hasPermission(permission) {
    if (!this.state.user || !Array.isArray(this.state.user.permissions)) {
      return false;
    }
    return this.state.user.permissions.includes(permission);
  },

  isPrincipal() {
    return this.hasPermission('reviews.write');
  },

  isEvaluator() {
    return this.hasPermission('plans.manage') || this.hasPermission('evaluations.edit');
  },

  // ---------------------------------------------------------------------------
  // 4. الشاشة 1: تسجيل الدخول (Screen 1: Login)
  // ---------------------------------------------------------------------------
  async handleLogin(event) {
    if (event) event.preventDefault();
    this.hideAlert();
    this.clearErrors(['login-username', 'login-password']);

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password },
    });

    if (!res.ok) {
      if (res.errors) {
        this.renderErrors(res.errors, 'login-');
      }
      this.showAlert(res.message || 'فشل تسجيل الدخول.', 'error');
      return;
    }

    this.state.token = res.data.token;
    this.state.user = res.data.user;
    localStorage.setItem('eval_token', this.state.token);
    localStorage.setItem('eval_user', JSON.stringify(this.state.user));

    this.updateUserNav();
    this.showAlert(`مرحباً بك: ${this.state.user.fullName}`, 'success');

    // التوجيه: المقيم والمدير يذهبان إلى لوحة التقييمات
    this.navTo('cycles');
  },

  quickLogin(username) {
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = 'ChangeMeDevPassword@2026';
    this.handleLogin();
  },

  handleLogout() {
    if (this.state.token) {
      this.request('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    this.state.token = null;
    this.state.user = null;
    this.state.currentEvaluation = null;
    this.state.currentPlan = null;
    localStorage.removeItem('eval_token');
    localStorage.removeItem('eval_user');

    this.updateUserNav();
    this.navTo('login');
    this.showAlert('تم تسجيل الخروج بنجاح.', 'info');
  },

  // ---------------------------------------------------------------------------
  // 5. الشاشة 2: لوحة الدورات والتقييمات (Screen 2: Cycles & Evaluations)
  // ---------------------------------------------------------------------------
  async loadEvaluations() {
    const tbody = document.getElementById('evaluations-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">جارِ جلب التقييمات...</td></tr>';

    const res = await this.request('/evaluations');
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">${res.message}</td></tr>`;
      return;
    }

    this.state.evaluations = res.data || [];
    if (this.state.evaluations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">لا توجد تقييمات مسجلة لهذه المدرسة.</td></tr>';
      return;
    }

    const statusBadge = (s) => {
      const cls = s === 'Completed' ? 'badge-green' : (s === 'InProgress' ? 'badge-yellow' : (s === 'Closed' ? 'badge-red' : 'badge-gray'));
      return `<span class="badge ${cls}">${s || '-'}</span>`;
    };

    tbody.innerHTML = this.state.evaluations.map((ev) => `
      <tr>
        <td><strong>#${ev.evaluationId}</strong></td>
        <td>${ev.school?.schoolName || 'المدرسة'}</td>
        <td>${ev.cycle?.academicYear || '-'}</td>
        <td>${statusBadge(ev.cycle?.status)}</td>
        <td>${statusBadge(ev.status)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="App.selectEvaluation(${ev.evaluationId})">
            فتح استمارة التقييم الذاتي
          </button>
        </td>
      </tr>
    `).join('');
  },

  selectEvaluation(evalId) {
    const ev = this.state.evaluations.find(e => e.evaluationId === evalId);
    if (!ev) return;
    this.state.currentEvaluation = ev;
    this.navTo('standards-tree');
  },

  // ---------------------------------------------------------------------------
  // 6. الشاشة 3: شجرة التقييم ورصد الدرجات (Screen 3: Standards Tree)
  // ---------------------------------------------------------------------------
  async loadStandardsTree(evalId) {
    const container = document.getElementById('tree-content-container');
    if (!container) return;
    container.innerHTML = '<div class="card" style="text-align: center;">جارِ تحميل شجرة المعايير والمؤشرات...</div>';

    const res = await this.request(`/evaluations/${evalId}/standards-tree`);
    if (!res.ok) {
      container.innerHTML = `<div class="card" style="color: red;">${res.message}</div>`;
      return;
    }

    this.state.standardsTree = res.data;
    const data = res.data;

    // تحديث ترويسة الشجرة والإنجاز الإجمالي من بيانات الـ API (قراءة schoolName و academicYear مباشرة من الاستجابة)
    const schoolName = data.schoolName || this.state.currentEvaluation?.school?.schoolName || this.state.user?.school?.schoolName || 'المدرسة';
    const cycleAcademicYear = data.academicYear || this.state.currentEvaluation?.cycle?.academicYear || '';
    document.getElementById('tree-school-title').textContent = `${schoolName} — استمارة التقييم الذاتي`;
    document.getElementById('tree-cycle-info').textContent = `العام الدراسي: ${cycleAcademicYear} | الإصدار المعياري: ${data.versionName || '#' + data.versionId}`;

    const pct = data.meta?.completionPercentage || 0;
    const completed = data.meta?.completedResults || 0;
    const total = data.meta?.totalActiveIndicators || 0;
    document.getElementById('tree-progress-text').textContent = `${pct}% (${completed} من ${total} مؤشر)`;
    document.getElementById('tree-progress-bar').style.width = `${pct}%`;

    // بناء كتل المعايير والمؤشرات
    container.innerHTML = (data.standards || []).map((std, sIdx) => `
      <div class="standard-block">
        <div class="standard-header" onclick="App.toggleAccordion('std-${sIdx}')">
          <span>${std.code} - ${std.name}</span>
          <span style="font-size: 0.8rem; color: var(--text-muted);">
            ${std.subStandards?.length || 0} مجالات فرعية ▾
          </span>
        </div>
        <div id="std-${sIdx}" class="standard-body">
          ${(std.subStandards || []).map(sub => `
            <div class="substandard-block">
              <h4 style="font-size: 0.95rem; color: #334155; margin-bottom: 0.5rem;">
                📌 ${sub.code} - ${sub.name}
              </h4>
              <div class="indicators-list">
                ${(sub.indicators || []).map(ind => this.renderIndicatorRow(ind)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  renderIndicatorRow(ind) {
    const isScored = ind.score !== null && ind.score !== undefined;
    const scoreBadge = isScored
      ? `<span class="badge ${ind.score >= 2 ? 'badge-green' : 'badge-yellow'}">الدرجة: ${ind.score} ${ind.scoreDescriptorLabel ? '(' + ind.scoreDescriptorLabel + ')' : ''}</span>`
      : '<span class="badge badge-gray">غير مرصود</span>';

    const hasResult = ind.resultId !== null && ind.resultId !== undefined;
    const evidenceCount = ind.evidenceCount || 0;
    const notesCount = ind.notesCount || 0;

    const toolsTags = (ind.verificationTools || []).map(t => `
      <span class="tool-tag" title="${t.usageGuidance || ''}">${t.name} (${t.toolType})</span>
    `).join('');

    const canEditScore = this.hasPermission('evaluations.edit');

    return `
      <div class="indicator-row" id="ind-row-${ind.indicatorId}">
        <div class="indicator-info">
          <div style="font-weight: 700; font-size: 0.9rem;">
            ${ind.code} — ${ind.name}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
            الوزن: ${ind.weight || 1} | ${scoreBadge}
          </div>
          <div class="tools-tags">
            <span style="font-size: 0.75rem; color: var(--text-muted); align-self: center;">الأدوات المعتمدة:</span>
            ${toolsTags || '<span style="font-size: 0.75rem; color: var(--text-muted);">لا توجد أدوات تحقق معتمدة لهذا المؤشر في قاعدة البيانات.</span>'}
          </div>
        </div>

        <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
          ${canEditScore ? `
            <button class="btn btn-sm btn-primary" onclick='App.openScoringModal(${JSON.stringify(ind).replace(/'/g, "&apos;")})'>
              ${isScored ? 'تعديل التقدير' : 'رصد التقدير'}
            </button>
          ` : `
            <button class="btn btn-sm btn-secondary" onclick='App.openScoringModal(${JSON.stringify(ind).replace(/'/g, "&apos;")}, true)'>
              استعراض التقدير
            </button>
          `}

          <button class="btn btn-sm btn-secondary" 
                  ${!hasResult ? 'disabled title="يجب رصد درجة المؤشر أولاً لتفعيل إرفاق الشواهد والملاحظات"' : ''}
                  onclick='App.openEvidencesModal(${JSON.stringify(ind).replace(/'/g, "&apos;")})'>
            📁 الشواهد (${evidenceCount}) والملاحظات (${notesCount})
          </button>
        </div>
      </div>
    `;
  },

  toggleAccordion(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
  },

  // ---------------------------------------------------------------------------
  // 7. الشاشة 4: رصد التقدير والملاحظات (Screen 4: Score Indicator & Notes)
  // ---------------------------------------------------------------------------
  openScoringModal(indicator, isReadOnly = false) {
    this.state.currentIndicator = indicator;
    const modal = document.getElementById('modal-scoring');
    if (!modal) return;

    const canEdit = this.hasPermission('evaluations.edit') && !isReadOnly;

    document.getElementById('score-modal-title').textContent = canEdit
      ? `${indicator.score !== null && indicator.score !== undefined ? 'تعديل' : 'رصد'} درجة المؤشر: ${indicator.name}`
      : `استعراض درجة المؤشر: ${indicator.name} (قراءة فقط)`;
    document.getElementById('score-indicator-code').textContent = indicator.code;
    document.getElementById('score-indicator-desc').textContent = indicator.description || 'لا يوجد وصف تفصيلي لهذا المؤشر في قاعدة البيانات.';

    const alertEl = document.getElementById('score-modal-alert');
    alertEl.classList.add('hidden');
    alertEl.textContent = '';

    // توليد خيارات التقدير الرقمي وواصفاتها ديناميكياً من الـ API (scoreDescriptors)
    const scoreContainer = document.getElementById('score-options-container');
    const descriptors = indicator.scoreDescriptors || [];

    if (descriptors.length === 0) {
      scoreContainer.innerHTML = '<div class="alert alert-warning" style="grid-column: 1 / -1; margin-bottom: 0;">لا توجد واصفات أداء معرفة لهذا المؤشر في قاعدة البيانات.</div>';
    } else {
      const sortedDesc = [...descriptors].sort((a, b) => (a.scoreValue ?? a.displayOrder) - (b.scoreValue ?? b.displayOrder));
      scoreContainer.innerHTML = sortedDesc.map(desc => {
        const isChecked = (indicator.score !== null && indicator.score !== undefined && indicator.score === desc.scoreValue);
        return `
          <label class="card" style="padding: 0.5rem; text-align: center; cursor: ${canEdit ? 'pointer' : 'default'}; margin-bottom: 0; ${!canEdit && !isChecked ? 'opacity: 0.5;' : ''}">
            <input type="radio" name="indicator-score-opt" value="${desc.scoreValue}" required 
                   ${isChecked ? 'checked' : ''} 
                   ${!canEdit ? 'disabled' : ''}
                   onchange="App.onScoreOptionChange(${desc.scoreValue})">
            <div style="font-weight: 700; margin-top: 0.2rem;">${desc.scoreValue} - ${desc.label}</div>
          </label>
        `;
      }).join('');
    }

    if (indicator.score !== null && indicator.score !== undefined) {
      this.onScoreOptionChange(indicator.score);
    } else {
      document.getElementById('score-descriptor-text').textContent = '(اختر تقديراً لعرض الواصفة المعتمدة للمؤشر)';
    }

    // بناء قائمة أدوات التحقق القابلة للاختيار من verificationTools القادمة من الـ API
    const toolsContainer = document.getElementById('score-verification-tools-container');
    const applicableTools = indicator.verificationTools || [];
    const usedToolIds = indicator.verificationToolIds || [];

    if (applicableTools.length === 0) {
      toolsContainer.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">لا توجد أدوات تحقق معتمدة لهذا المؤشر في قاعدة البيانات.</span>';
    } else {
      toolsContainer.innerHTML = applicableTools.map(tool => `
        <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: ${canEdit ? 'pointer' : 'default'};">
          <input type="checkbox" name="verificationToolIds" value="${tool.toolId}" 
                 ${usedToolIds.includes(tool.toolId) ? 'checked' : ''}
                 ${!canEdit ? 'disabled' : ''}>
          <span>${tool.name} (${tool.toolType})${tool.required ? ' <strong style="color:red">*</strong>' : ''}</span>
        </label>
      `).join('');
    }

    const textualInput = document.getElementById('score-textual-result');
    textualInput.value = indicator.textualResult || '';
    textualInput.disabled = !canEdit;

    const btnSaveScore = document.getElementById('btn-save-score');
    if (btnSaveScore) {
      btnSaveScore.style.display = canEdit ? 'inline-flex' : 'none';
    }

    // تفعيل قسم الملاحظات إذا كان هناك نتيجة سابقة
    const notesSec = document.getElementById('score-notes-section');
    const formAddNote = document.getElementById('form-add-note');
    if (indicator.resultId) {
      notesSec.classList.remove('hidden');
      this.renderNotesList(indicator.notes || []);
      if (formAddNote) {
        formAddNote.style.display = canEdit ? 'block' : 'none';
      }
    } else {
      notesSec.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  },

  closeScoringModal() {
    const modal = document.getElementById('modal-scoring');
    if (modal) modal.classList.add('hidden');
    this.state.currentIndicator = null;
  },

  onScoreOptionChange(score) {
    const ind = this.state.currentIndicator;
    if (!ind || !ind.scoreDescriptors) {
      document.getElementById('score-descriptor-text').textContent = 'لا توجد واصفات أداء معرفة لهذا المؤشر في قاعدة البيانات.';
      return;
    }

    const desc = (ind.scoreDescriptors || []).find(d => d.scoreValue === score);
    const descText = desc?.description || (desc?.label ? `المستوى المعياري: ${desc.label}` : 'لا يوجد توصيف معتمد لهذه الدرجة في قاعدة البيانات.');
    document.getElementById('score-descriptor-text').textContent = descText;
  },

  async handleSaveScore(event) {
    event.preventDefault();
    if (!this.hasPermission('evaluations.edit')) {
      this.showAlert('غير مصرح لك برصد نتائج التقييم (تتطلب evaluations.edit).', 'error');
      return;
    }
    const ind = this.state.currentIndicator;
    const evalId = this.state.currentEvaluation?.evaluationId;
    if (!ind || !evalId) return;

    const alertEl = document.getElementById('score-modal-alert');
    alertEl.classList.add('hidden');
    this.clearErrors(['score', 'verificationToolIds']);

    // قراءة التقدير
    const radios = document.getElementsByName('indicator-score-opt');
    let selectedScore = null;
    radios.forEach(r => {
      if (r.checked) selectedScore = parseInt(r.value);
    });

    if (selectedScore === null) {
      document.getElementById('err-score').textContent = 'يرجى اختيار التقدير الرقمي.';
      return;
    }

    // قراءة أدوات التحقق
    const toolCheckboxes = document.getElementsByName('verificationToolIds');
    const verificationToolIds = [];
    toolCheckboxes.forEach(cb => {
      if (cb.checked) verificationToolIds.push(parseInt(cb.value));
    });

    const textualResult = document.getElementById('score-textual-result').value.trim();

    const body = {
      score: selectedScore,
      verificationToolIds: verificationToolIds,
      textualResult: textualResult,
    };

    const res = await this.request(`/evaluations/${evalId}/indicators/${ind.indicatorId}/score`, {
      method: 'PUT',
      body: body,
    });

    if (!res.ok) {
      if (res.errors) {
        if (res.errors.cycle) {
          alertEl.textContent = res.errors.cycle[0];
          alertEl.classList.remove('hidden');
        } else if (res.errors.evaluation) {
          alertEl.textContent = res.errors.evaluation[0];
          alertEl.classList.remove('hidden');
        }
        if (res.errors.score) document.getElementById('err-score').textContent = res.errors.score[0];
        if (res.errors.verificationToolIds) document.getElementById('err-verificationToolIds').textContent = res.errors.verificationToolIds[0];
      } else {
        alertEl.textContent = res.message || 'فشلت عملية حفظ التقدير.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    this.showAlert('تم حفظ تقدير المؤشر بنجاح.', 'success');
    this.closeScoringModal();
    // إعادة تحميل الشجرة لتحديث النسب والواصفات
    this.loadStandardsTree(evalId);
  },

  renderNotesList(notes) {
    const listEl = document.getElementById('score-notes-list');
    if (!listEl) return;

    if (!notes || notes.length === 0) {
      listEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">لا توجد ملاحظات مدونة بعد.</span>';
      return;
    }

    listEl.innerHTML = notes.map(n => `
      <div style="background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem;">
        <div style="font-size: 0.85rem; line-height: 1.4;">${n.text}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 0.3rem;">
          <span>${n.authorName ? 'بواسطة: ' + n.authorName : (n.authorUserId ? 'مستخدم #' + n.authorUserId : '')}</span>
          <span>${n.createdAt ? new Date(n.createdAt).toLocaleString('ar') : ''}</span>
        </div>
      </div>
    `).join('');
  },

  async handleAddNote(event) {
    event.preventDefault();
    if (!this.hasPermission('evaluations.edit')) {
      this.showAlert('غير مصرح لك بتدوين ملاحظات تقييم (تتطلب evaluations.edit).', 'error');
      return;
    }
    const ind = this.state.currentIndicator;
    if (!ind || !ind.resultId) {
      this.showAlert('لا يمكن إضافة ملاحظة قبل رصد نتيجة للمؤشر.', 'error');
      return;
    }

    const input = document.getElementById('note-text-input');
    const text = input.value.trim();
    if (!text) return;

    const res = await this.request(`/evaluation-results/${ind.resultId}/notes`, {
      method: 'POST',
      body: { text: text },
    });

    if (!res.ok) {
      this.showAlert(res.message || 'فشلت إضافة الملاحظة.', 'error');
      return;
    }

    input.value = '';
    this.showAlert('تم تدوين الملاحظة بنجاح.', 'success');

    // تحديث قائمة الملاحظات محلياً
    const newNote = {
      noteId: res.data?.noteId,
      text: res.data?.text || text,
      authorUserId: res.data?.authorUserId || this.state.user?.userId,
      authorName: this.state.user?.fullName || '',
      createdAt: res.data?.createdAt || new Date().toISOString(),
    };
    if (!ind.notes) ind.notes = [];
    ind.notes.unshift(newNote);
    ind.notesCount = (ind.notesCount || 0) + 1;
    this.renderNotesList(ind.notes);

    // تحديث الشجرة لإعادة حساب العدادات
    this.loadStandardsTree(this.state.currentEvaluation.evaluationId);
  },

  // ---------------------------------------------------------------------------
  // 8. الشاشة 5: إدارة الشواهد والمرفقات (Screen 5: Evidences)
  // ---------------------------------------------------------------------------
  openEvidencesModal(indicator) {
    this.state.currentIndicator = indicator;
    const modal = document.getElementById('modal-evidences');
    if (!modal) return;

    const canManage = this.hasPermission('evidence.manage');

    document.getElementById('ev-modal-title').textContent = canManage
      ? `الشواهد الداعمة: ${indicator.name}`
      : `استعراض الشواهد الداعمة: ${indicator.name} (قراءة فقط)`;
    document.getElementById('ev-indicator-code').textContent = indicator.code;
    document.getElementById('ev-modal-alert').classList.add('hidden');

    const uploadCard = document.getElementById('card-upload-evidence');
    if (uploadCard) {
      uploadCard.style.display = canManage ? 'block' : 'none';
    }

    this.loadEvidences(indicator.resultId);
    modal.classList.remove('hidden');
  },

  closeEvidencesModal() {
    const modal = document.getElementById('modal-evidences');
    if (modal) modal.classList.add('hidden');
    this.state.currentIndicator = null;
  },

  async loadEvidences(resultId) {
    const container = document.getElementById('evidences-list-container');
    if (!container) return;
    container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">جارِ تحميل الشواهد...</span>';

    const res = await this.request(`/evaluation-results/${resultId}/evidences`);
    if (!res.ok) {
      container.innerHTML = `<span style="color: red; font-size: 0.85rem;">${res.message}</span>`;
      return;
    }

    this.state.currentEvidences = res.data || [];
    if (this.state.currentEvidences.length === 0) {
      container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">لا توجد شواهد مرفوعة لهذا المؤشر بعد.</span>';
      return;
    }

    const canManageEvidence = this.hasPermission('evidence.manage');

    container.innerHTML = this.state.currentEvidences.map(ev => {
      const versions = ev.versions || [];
      const currentVer = versions.find(v => v.current) || versions[0];
      const attachment = currentVer?.attachments?.[0];

      return `
        <div class="card" style="margin-bottom: 0.75rem; padding: 0.75rem; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong>📄 ${ev.title}</strong>
            <span class="badge badge-blue">إصدار v${currentVer?.versionNo || 1} (نشط)</span>
          </div>
          ${ev.description ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">${ev.description}</p>` : ''}
          ${ev.justification ? `<p style="font-size: 0.8rem; color: var(--primary); margin-bottom: 0.35rem;">المبرر: ${ev.justification}</p>` : ''}
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.8rem;">
              الملف: <strong>${attachment?.fileName || 'وثيقة الشاهد'}</strong> 
              (${attachment?.fileSize ? Math.round(attachment.fileSize / 1024) + ' KB' : ''})
            </div>
            <div style="display: flex; gap: 0.35rem;">
              ${attachment ? `
                <button class="btn btn-sm btn-secondary" onclick="App.downloadEvidenceVersion(${ev.evidenceId}, ${currentVer.versionId}, '${attachment.fileName}')">
                  ⬇️ تنزيل الملف
                </button>
              ` : ''}

              ${canManageEvidence ? `
                <button class="btn btn-sm btn-primary" onclick="App.triggerNewVersionUpload(${ev.evidenceId})">
                  + رفع نسخة جديدة
                </button>
              ` : ''}
            </div>
          </div>

          <!-- تفاصيل النسخ التاريخية السابقة إن وجدت -->
          ${versions.length > 1 ? `
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 0.35rem;">
              النسخ التاريخية السابقة: 
              ${versions.filter(v => !v.current).map(v => `v${v.versionNo}`).join(', ')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  async handleUploadEvidence(event) {
    event.preventDefault();
    if (!this.hasPermission('evidence.manage')) {
      this.showAlert('غير مصرح لك برفع شواهد (تتطلب evidence.manage).', 'error');
      return;
    }
    const ind = this.state.currentIndicator;
    if (!ind || !ind.resultId) return;

    this.clearErrors(['ev-title', 'ev-file']);
    const alertEl = document.getElementById('ev-modal-alert');
    alertEl.classList.add('hidden');

    const title = document.getElementById('ev-title').value.trim();
    const description = document.getElementById('ev-desc').value.trim();
    const justification = document.getElementById('ev-justification').value.trim();
    const fileInput = document.getElementById('ev-file');

    if (!fileInput.files || fileInput.files.length === 0) {
      document.getElementById('err-ev-file').textContent = 'الملف المرفق إلزامي.';
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (justification) formData.append('justification', justification);
    formData.append('file', fileInput.files[0]);

    const res = await this.request(`/evaluation-results/${ind.resultId}/evidences`, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });

    if (!res.ok) {
      if (res.errors) {
        if (res.errors.cycle) {
          alertEl.textContent = res.errors.cycle[0];
          alertEl.classList.remove('hidden');
        } else if (res.errors.evaluation) {
          alertEl.textContent = res.errors.evaluation[0];
          alertEl.classList.remove('hidden');
        }
        if (res.errors.title) document.getElementById('err-ev-title').textContent = res.errors.title[0];
        if (res.errors.file) document.getElementById('err-ev-file').textContent = res.errors.file[0];
      } else {
        alertEl.textContent = res.message || 'فشل رفع الشاهد.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    document.getElementById('form-upload-evidence').reset();
    this.showAlert('تم رفع الشاهد ونسخته الأولى بنجاح.', 'success');
    this.loadEvidences(ind.resultId);
    this.loadStandardsTree(this.state.currentEvaluation.evaluationId);
  },

  async triggerNewVersionUpload(evidenceId) {
    if (!this.hasPermission('evidence.manage')) {
      this.showAlert('غير مصرح لك برفع نسخ شواهد جديدة (تتطلب evidence.manage).', 'error');
      return;
    }
    // فتح نافذة اختيار ملف لرفع نسخة جديدة
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx';

    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;

      const formData = new FormData();
      formData.append('file', input.files[0]);

      const res = await this.request(`/evidences/${evidenceId}/versions`, {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      if (!res.ok) {
        this.showAlert(res.message || 'فشل رفع النسخة الجديدة.', 'error');
        return;
      }

      this.showAlert('تم رفع النسخة الجديدة بنجاح (v' + (res.data?.versionNo || '') + ').', 'success');
      this.loadEvidences(this.state.currentIndicator.resultId);
    };

    input.click();
  },

  async downloadEvidenceVersion(evidenceId, versionId, filename) {
    const url = `${this.state.apiUrl}/evidences/${evidenceId}/versions/${versionId}/download`;
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.state.token}`,
        },
      });

      if (!response.ok) {
        this.showAlert('تعذر تنزيل الملف المرفق.', 'error');
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'evidence-file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      this.showAlert('خطأ أثناء تنزيل الملف.', 'error');
    }
  },

  // ---------------------------------------------------------------------------
  // 9. الشاشة 6: اقتراحات التحسين (Screen 6: Suggestions)
  // ---------------------------------------------------------------------------
  async loadSuggestions() {
    const evalId = this.state.currentEvaluation?.evaluationId;
    if (!evalId) return;

    const tbody = document.getElementById('suggestions-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">جارِ حساب الاقتراحات...</td></tr>';

    const res = await this.request(`/evaluations/${evalId}/improvement-suggestions`);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">${res.message}</td></tr>`;
      return;
    }

    const data = res.data;
    this.state.suggestions = data.suggestions || [];

    document.getElementById('sugg-target-score').textContent = data.targetScore || '-';
    document.getElementById('sugg-total-count').textContent = data.meta?.totalSuggestions || 0;
    document.getElementById('sugg-high-count').textContent = data.meta?.highPriorityCount || 0;
    document.getElementById('sugg-med-count').textContent = data.meta?.mediumPriorityCount || 0;
    document.getElementById('sugg-adopted-count').textContent = data.meta?.alreadyAdoptedCount || 0;

    if (this.state.suggestions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: green;">🎉 جميع المؤشرات حققت أو تجاوزت التقدير المستهدف! لا توجد فجوات حالياً.</td></tr>';
      return;
    }

    tbody.innerHTML = this.state.suggestions.map((s, idx) => `
      <tr>
        <td><strong>${s.indicatorCode}</strong></td>
        <td>${s.indicatorName}</td>
        <td><span class="badge ${s.score <= 1 ? 'badge-red' : 'badge-yellow'}">${s.score}</span></td>
        <td>${s.targetScore}</td>
        <td>-${s.gap}</td>
        <td>
          <span class="badge ${s.suggestedPriority === 'High' ? 'badge-red' : 'badge-yellow'}">
            ${s.priorityLabel || s.suggestedPriority}
          </span>
        </td>
        <td>
          ${s.isAlreadyAdopted 
            ? '<span class="badge badge-green">متبنى مسبقاً ✓</span>' 
            : '<span class="badge badge-gray">غير متبنى</span>'}
        </td>
        <td>
          ${this.hasPermission('plans.manage') ? `
            <button class="btn btn-sm ${s.isAlreadyAdopted ? 'btn-secondary' : 'btn-success'}" 
                    ${s.isAlreadyAdopted ? 'disabled' : ''}
                    onclick="App.openAdoptModal(${idx})">
              ${s.isAlreadyAdopted ? 'تم التبني' : 'تبني كمجال تحسين'}
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              ${s.isAlreadyAdopted ? 'متبنى مسبقاً' : 'عرض فقط'}
            </span>
          `}
        </td>
      </tr>
    `).join('');
  },

  openAdoptModal(idx) {
    if (!this.hasPermission('plans.manage')) {
      this.showAlert('غير مصرح لك بتبني مجالات التحسين (تتطلب plans.manage).', 'error');
      return;
    }
    const s = this.state.suggestions[idx];
    if (!s) return;

    this.state.selectedSuggestionIndex = idx;
    const modal = document.getElementById('modal-adopt-suggestion');
    if (!modal) return;

    document.getElementById('adopt-modal-title').textContent = `تبني مجال تحسين للمؤشر: ${s.indicatorName || s.indicatorCode}`;
    document.getElementById('adopt-name').value = s.suggestedName || s.indicatorName || '';
    document.getElementById('adopt-priority').value = s.suggestedPriority || 'High';
    const descEl = document.getElementById('adopt-description');
    if (descEl) descEl.value = ''; // يترك فارغاً ليدخله المستخدم يدوياً (Gap 4)
    const alertEl = document.getElementById('adopt-modal-alert');
    if (alertEl) alertEl.classList.add('hidden');

    modal.classList.remove('hidden');
  },

  closeAdoptModal() {
    const modal = document.getElementById('modal-adopt-suggestion');
    if (modal) modal.classList.add('hidden');
    this.state.selectedSuggestionIndex = null;
  },

  async handleConfirmAdopt(event) {
    event.preventDefault();
    if (!this.hasPermission('plans.manage')) {
      this.showAlert('غير مصرح لك بتبني مجالات التحسين (تتطلب plans.manage).', 'error');
      return;
    }
    const idx = this.state.selectedSuggestionIndex;
    const s = this.state.suggestions[idx];
    if (!s) return;

    const name = document.getElementById('adopt-name').value.trim();
    const priority = document.getElementById('adopt-priority').value;
    const descriptionVal = document.getElementById('adopt-description')?.value.trim();
    const description = descriptionVal ? descriptionVal : null; // يرسل null إن لم يدخل المستخدم وصفاً يدويًا

    const alertEl = document.getElementById('adopt-modal-alert');
    if (alertEl) alertEl.classList.add('hidden');

    const res = await this.request('/improvement-areas', {
      method: 'POST',
      body: {
        indicatorId: s.indicatorId,
        name: name,
        description: description,
        priority: priority,
      },
    });

    if (!res.ok) {
      if (alertEl) {
        alertEl.textContent = res.message || 'فشلت عملية تبني مجال التحسين.';
        alertEl.classList.remove('hidden');
      } else {
        this.showAlert(res.message || 'فشلت عملية تبني مجال التحسين.', 'error');
      }
      return;
    }

    this.closeAdoptModal();
    this.showAlert(`تم تبني مجال التحسين بنجاح للأولوية: ${priority}`, 'success');
    this.loadSuggestions();
  },

  handleAdoptSuggestion(idx) {
    return this.openAdoptModal(idx);
  },

  // ---------------------------------------------------------------------------
  // 10. الشاشة 7: خطط التحسين المدرسي (Screen 7: Plans)
  // ---------------------------------------------------------------------------
  async loadPlans() {
    const tbody = document.getElementById('plans-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">جارِ جلب الخطط...</td></tr>';

    // ضبط ظهور زر إنشاء الخطة لمن يملك صلاحية plans.manage فقط
    const btnCreatePlan = document.getElementById('btn-show-create-plan');
    if (btnCreatePlan) {
      btnCreatePlan.style.display = this.hasPermission('plans.manage') ? 'inline-flex' : 'none';
    }

    const res = await this.request('/improvement-plans');
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="10" style="color: red; text-align: center;">${res.message}</td></tr>`;
      return;
    }

    this.state.plans = res.data || [];
    if (this.state.plans.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">لا توجد خطط تحسين منشأة لهذه المدرسة بعد.</td></tr>';
      return;
    }

    tbody.innerHTML = this.state.plans.map(p => `
      <tr>
        <td><strong>#${p.planId}</strong></td>
        <td>${p.title}</td>
        <td>${p.academicYear || p.cycleName || '-'}</td>
        <td style="font-size: 0.8rem;">${p.startDate} إلى ${p.endDate}</td>
        <td><span class="badge ${p.status === 'Active' ? 'badge-green' : (p.status === 'Draft' ? 'badge-yellow' : 'badge-blue')}">${p.statusLabel || p.status}</span></td>
        <td><span class="badge badge-gray">${p.overallProgressLabel || p.overallProgress}</span></td>
        <td><span class="badge badge-gray">${p.areasCount}</span></td>
        <td><span class="badge badge-gray">${p.totalActions}</span></td>
        <td>
          ${p.delayedActions > 0 
            ? `<span class="badge badge-red">${p.delayedActions} متأخر</span>` 
            : '<span class="badge badge-green">0</span>'}
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="App.showPlanDetails(${p.planId})">
            عرض التفاصيل
          </button>
        </td>
      </tr>
    `).join('');
  },

  async toggleCreatePlanForm() {
    const card = document.getElementById('card-create-plan');
    if (!card) return;

    if (card.classList.contains('hidden')) {
      // جلب مجالات التحسين المتاحة للمدرسة لتحديدها
      const res = await this.request('/improvement-areas');
      const container = document.getElementById('plan-create-areas-checklist');
      if (res.ok && res.data) {
        this.state.improvementAreas = res.data;
        if (res.data.length === 0) {
          container.innerHTML = '<span style="font-size: 0.85rem; color: red;">لا توجد مجالات تحسين متبناة بعد. يرجى تبني مجال أولاً من شاشة الاقتراحات.</span>';
        } else {
          container.innerHTML = res.data.map(a => `
            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" name="planCreateAreaIds" value="${a.areaId}">
              <span>[${a.priorityLabel}] ${a.name} (${a.indicatorCode})</span>
            </label>
          `).join('');
        }
      }
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  },

  async handleCreatePlan(event) {
    event.preventDefault();
    this.clearErrors(['plan-title', 'plan-start-date', 'plan-end-date', 'plan-areaIds']);

    const title = document.getElementById('plan-title').value.trim();
    const startDate = document.getElementById('plan-start-date').value;
    const endDate = document.getElementById('plan-end-date').value;
    const cycleId = this.state.currentEvaluation?.cycleId || 1;

    const areaCheckboxes = document.getElementsByName('planCreateAreaIds');
    const areaIds = [];
    areaCheckboxes.forEach(cb => {
      if (cb.checked) areaIds.push(parseInt(cb.value));
    });

    if (areaIds.length === 0) {
      document.getElementById('err-plan-areaIds').textContent = 'يجب اختيار مجال تحسين واحد على الأقل.';
      return;
    }

    const res = await this.request('/improvement-plans', {
      method: 'POST',
      body: {
        cycleId,
        title,
        startDate,
        endDate,
        areaIds,
      },
    });

    if (!res.ok) {
      if (res.errors) {
        if (res.errors.title) document.getElementById('err-plan-title').textContent = res.errors.title[0];
        if (res.errors.startDate) document.getElementById('err-plan-start-date').textContent = res.errors.startDate[0];
        if (res.errors.endDate) document.getElementById('err-plan-end-date').textContent = res.errors.endDate[0];
        if (res.errors.areaIds) document.getElementById('err-plan-areaIds').textContent = res.errors.areaIds[0];
      }
      this.showAlert(res.message || 'فشلت عملية إنشاء الخطة.', 'error');
      return;
    }

    this.showAlert('تم إنشاء مسودة خطة التحسين بنجاح.', 'success');
    document.getElementById('card-create-plan').classList.add('hidden');
    document.getElementById('form-create-plan').reset();
    this.loadPlans();
    this.showPlanDetails(res.data.planId);
  },

  async showPlanDetails(planId) {
    const container = document.getElementById('plan-details-container');
    if (!container) return;
    container.classList.remove('hidden');

    const res = await this.request(`/improvement-plans/${planId}`);
    if (!res.ok) {
      this.showAlert(res.message || 'تعذر جلب تفاصيل الخطة.', 'error');
      return;
    }

    this.state.currentPlan = res.data;
    const p = res.data;

    document.getElementById('plan-det-title').textContent = `خطة: ${p.title}`;
    document.getElementById('plan-det-meta').textContent = `العام الدراسي: ${p.academicYear || p.cycleName || '-'} | المدرسة: ${p.schoolName || '-'} | الفترة: من ${p.startDate} إلى ${p.endDate}`;

    // المؤشرات السريعة ونظرة التقدم
    document.getElementById('plan-det-status-badge').textContent = p.statusLabel || p.status;
    document.getElementById('plan-det-progress-badge').textContent = p.overallProgressLabel || p.overallProgress;
    document.getElementById('plan-det-pending-count').textContent = p.overview?.pendingActions || 0;
    document.getElementById('plan-det-inprogress-count').textContent = p.overview?.inProgressActions || 0;
    document.getElementById('plan-det-done-count').textContent = p.overview?.doneActions || 0;
    document.getElementById('plan-det-delayed-count').textContent = p.overview?.delayedActions || 0;

    // أزرار دورة الحياة (Active / Completed) لمن يملك plans.manage فقط
    const actionsBox = document.getElementById('plan-lifecycle-actions');
    actionsBox.innerHTML = '';

    if (this.hasPermission('plans.manage')) {
      if (p.status === 'Draft') {
        actionsBox.innerHTML += `
          <button class="btn btn-sm btn-success" onclick="App.handleUpdatePlanStatus(${p.planId}, 'Active')">
            🚀 تفعيل الخطة (Active)
          </button>
        `;
      } else if (p.status === 'Active') {
        actionsBox.innerHTML += `
          <button class="btn btn-sm btn-primary" onclick="App.handleUpdatePlanStatus(${p.planId}, 'Completed')">
            🏁 إكمال الخطة (Completed)
          </button>
        `;
      }
    }

    // المجالات
    const areasList = document.getElementById('plan-det-areas-list');
    areasList.innerHTML = (p.areas || []).map(a => `
      <span class="badge ${a.priority === 'High' ? 'badge-red' : 'badge-yellow'}" style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">
        ${a.name} [${a.priorityLabel || a.priority}]
      </span>
    `).join('');

    // الإجراءات
    this.renderPlanActions(p.actions || []);

    // زر إضافة إجراء تنفيذي لمن يملك plans.manage فقط
    const btnAddAct = document.getElementById('btn-open-add-action');
    if (btnAddAct) {
      btnAddAct.style.display = this.hasPermission('plans.manage') ? 'inline-flex' : 'none';
    }

    // ملاحظات المراجعة
    this.renderReviewNotes(p.reviewNotes || []);

    // إخفاء أو إظهار نموذج مراجعة المدير لمن يملك reviews.write فقط
    const formReview = document.getElementById('principal-review-form-container');
    if (formReview) {
      formReview.style.display = this.hasPermission('reviews.write') ? 'block' : 'none';
    }

    // التمرير للتفاصيل
    container.scrollIntoView({ behavior: 'smooth' });
  },

  async handleUpdatePlanStatus(planId, newStatus) {
    if (!this.hasPermission('plans.manage')) {
      this.showAlert('غير مصرح لك بتحديث حالة الخطة (تتطلب plans.manage).', 'error');
      return;
    }
    const res = await this.request(`/improvement-plans/${planId}`, {
      method: 'PATCH',
      body: { status: newStatus },
    });

    if (!res.ok) {
      if (res.errors?.status) {
        this.showAlert(res.errors.status[0], 'error', 7000);
      } else {
        this.showAlert(res.message || 'فشل تحديث حالة الخطة.', 'error');
      }
      return;
    }

    this.showAlert(`تم تحديث حالة الخطة إلى: ${newStatus}`, 'success');
    this.loadPlans();
    this.showPlanDetails(planId);
  },

  // ---------------------------------------------------------------------------
  // 11. الشاشة 8: إدارة الإجراءات التنفيذية (Screen 8: Actions)
  // ---------------------------------------------------------------------------
  renderPlanActions(actions) {
    const tbody = document.getElementById('plan-det-actions-body');
    if (!tbody) return;

    if (!actions || actions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">لا توجد إجراءات تنفيذية مضافة للخطة بعد.</td></tr>';
      return;
    }

    tbody.innerHTML = actions.map(act => {
      const statusCls = act.status === 'Done' ? 'badge-green' : (act.status === 'InProgress' ? 'badge-blue' : (act.status === 'Cancelled' ? 'badge-gray' : 'badge-yellow'));
      return `
        <tr>
          <td><strong>#${act.actionId}</strong></td>
          <td>${act.areaName}</td>
          <td><strong>${act.title}</strong></td>
          <td>${act.responsiblePersonDescription}</td>
          <td style="font-size: 0.8rem;">${act.startDate}</td>
          <td style="font-size: 0.8rem;">${act.dueDate}</td>
          <td><span class="badge ${statusCls}">${act.statusLabel || act.status}</span></td>
          <td><span class="badge badge-gray">${act.progressLabel || act.progress}</span></td>
          <td>
            ${act.isDelayed 
              ? '<span class="badge badge-red">⚠️ متأخر</span>' 
              : '<span class="badge badge-green">في الموعد</span>'}
          </td>
          <td>
            ${this.hasPermission('plans.manage') ? `
              <button class="btn btn-sm btn-secondary" onclick="App.quickUpdateAction(${act.actionId})">
                تحديث الحالة
              </button>
            ` : '<span style="font-size: 0.75rem; color: var(--text-muted);">عرض فقط</span>'}
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddActionModal() {
    const p = this.state.currentPlan;
    if (!p || !this.hasPermission('plans.manage')) return;

    const modal = document.getElementById('modal-action');
    const selectArea = document.getElementById('action-area-id');
    const alertEl = document.getElementById('modal-action-alert');
    alertEl.classList.add('hidden');
    this.clearErrors(['action-areaId', 'action-title', 'action-responsible', 'action-due-date']);

    // تعبئة مجالات الخطة فقط لفرض المفتاح الأجنبي المركب
    selectArea.innerHTML = (p.areas || []).map(a => `
      <option value="${a.areaId}">${a.name} [${a.priorityLabel || a.priority}]</option>
    `).join('');

    modal.classList.remove('hidden');
  },

  closeActionModal() {
    const modal = document.getElementById('modal-action');
    if (modal) modal.classList.add('hidden');
  },

  async handleSaveAction(event) {
    event.preventDefault();
    if (!this.hasPermission('plans.manage')) {
      this.showAlert('غير مصرح لك بإضافة إجراءات (تتطلب plans.manage).', 'error');
      return;
    }
    const p = this.state.currentPlan;
    if (!p) return;

    this.clearErrors(['action-areaId', 'action-title', 'action-responsible', 'action-due-date']);
    const alertEl = document.getElementById('modal-action-alert');
    alertEl.classList.add('hidden');

    const areaId = parseInt(document.getElementById('action-area-id').value);
    const title = document.getElementById('action-title').value.trim();
    const responsible = document.getElementById('action-responsible').value.trim();
    const startDate = document.getElementById('action-start-date').value;
    const dueDate = document.getElementById('action-due-date').value;
    const status = document.getElementById('action-status').value;
    const progress = document.getElementById('action-progress').value;

    const res = await this.request(`/improvement-plans/${p.planId}/actions`, {
      method: 'POST',
      body: {
        areaId,
        title,
        responsiblePersonDescription: responsible,
        startDate,
        dueDate,
        status,
        progress,
      },
    });

    if (!res.ok) {
      if (res.errors) {
        if (res.errors.areaId) document.getElementById('err-action-areaId').textContent = res.errors.areaId[0];
        if (res.errors.title) document.getElementById('err-action-title').textContent = res.errors.title[0];
        if (res.errors.responsiblePersonDescription) document.getElementById('err-action-responsible').textContent = res.errors.responsiblePersonDescription[0];
        if (res.errors.dueDate) document.getElementById('err-action-due-date').textContent = res.errors.dueDate[0];
      } else {
        alertEl.textContent = res.message || 'فشلت إضافة الإجراء.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    this.showAlert('تمت إضافة الإجراء التنفيذي بنجاح.', 'success');
    this.closeActionModal();
    this.showPlanDetails(p.planId);
    this.loadPlans();
  },

  async quickUpdateAction(actionId) {
    if (!this.hasPermission('plans.manage')) {
      this.showAlert('غير مصرح لك بتعديل الإجراء (تتطلب plans.manage).', 'error');
      return;
    }
    const p = this.state.currentPlan;
    if (!p) return;

    // نافذة اختيار سريعة للحالة والتقدم
    const act = (p.actions || []).find(a => a.actionId === actionId);
    if (!act) return;

    const newStatus = prompt('اختر حالة الإجراء (Pending, InProgress, Done, Cancelled):', act.status);
    if (!newStatus) return;

    const newProgress = prompt('اختر مستوى التقدم (NotStarted, Limited, Moderate, Significant, Complete):', act.progress);
    if (!newProgress) return;

    const res = await this.request(`/improvement-plans/${p.planId}/actions/${actionId}`, {
      method: 'PATCH',
      body: {
        status: newStatus.trim(),
        progress: newProgress.trim(),
      },
    });

    if (!res.ok) {
      this.showAlert(res.message || 'فشل تحديث الإجراء.', 'error');
      return;
    }

    this.showAlert('تم تحديث حالة وتقدم الإجراء بنجاح.', 'success');
    this.showPlanDetails(p.planId);
    this.loadPlans();
  },

  // ---------------------------------------------------------------------------
  // 12. الشاشة 9: ملاحظات مراجعة مدير المدرسة (Screen 9: Review Notes)
  // ---------------------------------------------------------------------------
  renderReviewNotes(notes) {
    const listEl = document.getElementById('plan-det-notes-list');
    if (!listEl) return;

    if (!notes || notes.length === 0) {
      listEl.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">لا توجد ملاحظات مراجعة مسجلة على هذه الخطة بعد.</span>';
      return;
    }

    listEl.innerHTML = notes.map(n => `
      <div style="background: #fff; border: 1px solid var(--border); border-right: 4px solid #16a34a; border-radius: 4px; padding: 0.5rem 0.75rem; margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
          <strong>🎓 ${n.authorName || 'مدير المدرسة'}</strong>
          <span>${n.createdAt ? new Date(n.createdAt).toLocaleString('ar') : ''}</span>
        </div>
        <div style="font-size: 0.85rem; color: #1e293b;">${n.text}</div>
      </div>
    `).join('');
  },

  async handleSaveReviewNote(event) {
    event.preventDefault();
    if (!this.hasPermission('reviews.write')) {
      this.showAlert('غير مصرح لك بتدوين ملاحظة مراجعة (تتطلب reviews.write).', 'error');
      return;
    }
    const p = this.state.currentPlan;
    if (!p) return;

    const input = document.getElementById('review-note-text');
    const text = input.value.trim();
    if (!text) return;

    const res = await this.request(`/improvement-plans/${p.planId}/review-notes`, {
      method: 'POST',
      body: { text },
    });

    if (!res.ok) {
      this.showAlert(res.message || 'فشل تدوين ملاحظة المراجعة.', 'error');
      return;
    }

    input.value = '';
    this.showAlert('تم حفظ ملاحظة المراجعة بنجاح.', 'success');
    this.showPlanDetails(p.planId);
  },

  // ---------------------------------------------------------------------------
  // 13. أدوات مساعدة للأخطاء (Validation Errors Helpers)
  // ---------------------------------------------------------------------------
  renderErrors(errors, prefix = '') {
    for (const [key, msgs] of Object.entries(errors)) {
      const el = document.getElementById(`err-${prefix}${key}`) || document.getElementById(`err-${key}`);
      if (el) {
        el.textContent = Array.isArray(msgs) ? msgs[0] : msgs;
      }
    }
  },

  clearErrors(fieldIds) {
    fieldIds.forEach(id => {
      const el = document.getElementById(`err-${id}`);
      if (el) el.textContent = '';
    });
  },
};

// تشغيل التطبيق عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
