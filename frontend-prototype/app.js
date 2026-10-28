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
    currentStandardId: 1,
    evidenceSummaryData: null,
    evidenceFilterMode: 'all',
    exportReportData: null,
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
        let msg = data?.message;
        if (!msg) {
          if (response.status === 401) msg = "انتهت صلاحية الجلسة أو لم يتم تسجيل الدخول (401).";
          else if (response.status === 403) msg = "غير مصرح لك بإجراء هذه العملية (403).";
          else if (response.status === 404) msg = "المورد المطلوب غير موجود أو يخص مدرسة أخرى (404).";
          else if (response.status === 422) msg = "البيانات المدخلة غير صالحة أو التقييم مقفل (422).";
          else msg = `خطأ في الطلب (${response.status})`;
        }
        return {
          ok: false,
          status: response.status,
          data: data,
          message: msg,
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
      'dashboard',
      'cycles',
      'standards-tree',
      'standards-review',
      'suggestions',
      'plans',
      'assessment-results',
      'standard-result',
      'evidence-summary',
      'evidence-inventory',
      'plans-summary',
      'export-report',
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
    if (screenName === 'dashboard') {
      this.loadDashboard();
    } else if (screenName === 'cycles') {
      this.loadEvaluations();
    } else if (screenName === 'standards-tree' && this.state.currentEvaluation) {
      this.loadStandardsTree(this.state.currentEvaluation.evaluationId);
    } else if (screenName === 'standards-review') {
      this.loadStandardsReview();
    } else if (screenName === 'suggestions' && this.state.currentEvaluation) {
      this.loadSuggestions();
    } else if (screenName === 'plans') {
      this.loadPlans();
    } else if (screenName === 'assessment-results') {
      this.loadAssessmentResults();
    } else if (screenName === 'standard-result') {
      this.loadStandardResult(this.state.currentStandardId || 1);
    } else if (screenName === 'evidence-summary') {
      this.loadEvidenceSummary();
    } else if (screenName === 'evidence-inventory') {
      this.loadEvidenceInventory();
    } else if (screenName === 'plans-summary') {
      this.loadPlansSummary();
    } else if (screenName === 'export-report') {
      this.loadExportReport();
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
    const bcDash = document.getElementById('bc-dashboard');
    const bcCycles = document.getElementById('bc-cycles');
    const bcTree = document.getElementById('bc-tree');
    const bcResults = document.getElementById('bc-results');
    const bcEvidence = document.getElementById('bc-evidence-summary');
    const bcEvidenceInv = document.getElementById('bc-evidence-inventory');
    const bcPlansSummary = document.getElementById('bc-plans-summary');
    const bcExport = document.getElementById('bc-export');
    const bcReview = document.getElementById('bc-standards-review');

    if (bcDash) bcDash.style.display = 'inline';
    if (bcCycles) bcCycles.style.display = 'inline';
    if (bcTree) bcTree.style.display = this.state.currentEvaluation ? 'inline' : 'none';
    if (bcResults) bcResults.style.display = 'inline';
    if (bcEvidence) bcEvidence.style.display = 'inline';
    if (bcEvidenceInv) bcEvidenceInv.style.display = 'inline';
    if (bcPlansSummary) bcPlansSummary.style.display = 'inline';
    if (bcExport) bcExport.style.display = 'inline';
    if (bcReview) bcReview.style.display = 'inline';
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

    this.updateDevToolsVisibility();
  },

  isDevMode() {
    if (localStorage.getItem('dev_mode') === 'true') return true;
    if (!this.state.user) return false;
    const email = this.state.user.email || '';
    const username = this.state.user.username || '';
    if (email.endsWith('.local') || username.includes('evaluator') || username.includes('admin')) {
      return true;
    }
    return false;
  },

  updateDevToolsVisibility() {
    const devTools = document.querySelectorAll('.dev-only-tools');
    const show = this.isDevMode();
    devTools.forEach(el => {
      el.style.display = show ? 'inline-flex' : 'none';
    });
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
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            <button class="btn btn-sm btn-primary" onclick="App.selectEvaluation(${ev.evaluationId})">
              📝 استمارة التقييم
            </button>
            <button class="btn btn-sm btn-secondary" onclick="App.openResultsForEvaluation(${ev.evaluationId}, ${ev.school?.schoolId || ev.schoolId})">
              🎯 النتائج
            </button>
            <button class="btn btn-sm btn-secondary" onclick="App.openEvidenceForEvaluation(${ev.evaluationId}, ${ev.school?.schoolId || ev.schoolId})">
              📁 الشواهد
            </button>
            <button class="btn btn-sm btn-secondary" onclick="App.openExportForEvaluation(${ev.evaluationId}, ${ev.school?.schoolId || ev.schoolId})">
              📥 تصدير
            </button>
          </div>
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
    this.updateDevToolsVisibility();

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

    // عرض سياق المعيار والمجال الفرعي ووصف المؤشر
    const stdInfoEl = document.getElementById('score-std-info');
    if (stdInfoEl) {
      stdInfoEl.textContent = indicator.standardName 
        ? `${indicator.standardName}${indicator.standardDescription ? ' — ' + indicator.standardDescription : ''}`
        : 'المعيار المعتمد';
    }
    const subStdInfoEl = document.getElementById('score-substd-info');
    if (subStdInfoEl) {
      subStdInfoEl.textContent = indicator.subStandardName 
        ? `${indicator.subStandardName}${indicator.subStandardDescription ? ' — ' + indicator.subStandardDescription : ''}`
        : 'المجال الفرعي';
    }
    const indDescEl = document.getElementById('score-indicator-desc');
    if (indDescEl) {
      indDescEl.textContent = indicator.description || 'لا يوجد وصف تفصيلي لهذا المؤشر في قاعدة البيانات.';
    }

    const alertEl = document.getElementById('score-modal-alert');
    alertEl.classList.add('hidden');
    alertEl.textContent = '';

    // مسح أخطاء الحقول
    this.clearErrors(['score', 'verificationToolIds']);

    // بناء بطاقات الواصفات الأربع (Score Descriptors Cards)
    const cardsContainer = document.getElementById('score-descriptor-cards');
    const descriptors = indicator.scoreDescriptors || [];
    const valInput = document.getElementById('selected-score-value');
    const descIdInput = document.getElementById('selected-descriptor-id');

    let currentScore = (indicator.score !== null && indicator.score !== undefined) ? parseInt(indicator.score) : null;
    let currentDescId = indicator.scoreDescriptorId || null;

    valInput.value = currentScore !== null ? currentScore : '';
    descIdInput.value = currentDescId !== null ? currentDescId : '';

    if (descriptors.length === 0) {
      cardsContainer.innerHTML = '<div class="alert alert-warning" style="grid-column: 1 / -1;">لا توجد واصفات أداء معرفة لهذا المؤشر في قاعدة البيانات.</div>';
    } else {
      const sortedDesc = [...descriptors].sort((a, b) => (a.scoreValue ?? a.displayOrder) - (b.scoreValue ?? b.displayOrder));
      
      // مطابقة descriptorId في حال كان المؤشر مرصوداً ومحفوظاً
      if (currentScore !== null && !currentDescId) {
        const match = sortedDesc.find(d => d.scoreValue === currentScore);
        if (match) {
          currentDescId = match.descriptorId;
          descIdInput.value = currentDescId;
        }
      }

      cardsContainer.innerHTML = sortedDesc.map(desc => {
        const isSelected = (currentScore !== null && currentScore === desc.scoreValue);
        const levelBadgeClass = desc.scoreValue >= 2 ? 'badge-green' : (desc.scoreValue === 1 ? 'badge-yellow' : 'badge-red');
        return `
          <div class="descriptor-card ${isSelected ? 'selected' : ''}" 
               id="desc-card-${desc.scoreValue}"
               ${canEdit ? `onclick="App.selectScoreCard(${desc.scoreValue}, ${desc.descriptorId})"` : ''}
               style="cursor: ${canEdit ? 'pointer' : 'default'};">
            <div class="card-score-badge">
              <span>الدرجة: ${desc.scoreValue}</span>
              <span class="badge ${levelBadgeClass}">${desc.label}</span>
            </div>
            <div class="card-desc-text">${desc.description || 'لا يوجد نص واصفة معتمد'}</div>
          </div>
        `;
      }).join('');
    }

    // بناء قائمة أدوات التحقق من verificationTools مع الاسم والنوع والإلزامية وإرشاد الاستخدام
    const toolsContainer = document.getElementById('score-verification-tools-container');
    const applicableTools = indicator.verificationTools || [];
    const usedToolIds = indicator.verificationToolIds || [];

    if (applicableTools.length === 0) {
      toolsContainer.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">لا توجد أدوات تحقق معتمدة لهذا المؤشر في قاعدة البيانات.</span>';
    } else {
      toolsContainer.innerHTML = applicableTools.map(tool => `
        <div class="tool-item-row">
          <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: ${canEdit ? 'pointer' : 'default'};">
            <input type="checkbox" name="verificationToolIds" value="${tool.toolId}" 
                   ${usedToolIds.includes(tool.toolId) ? 'checked' : ''}
                   ${!canEdit ? 'disabled' : ''}>
            <span style="font-weight: 600;">${tool.name} (${tool.toolType})</span>
            ${tool.required ? '<span class="badge badge-red" style="font-size: 0.7rem;">إلزامية *</span>' : '<span class="badge badge-gray" style="font-size: 0.7rem;">اختيارية</span>'}
          </label>
          ${tool.usageGuidance ? `<div class="tool-item-guidance">💡 إرشاد: ${tool.usageGuidance}</div>` : ''}
        </div>
      `).join('');
    }

    // بناء قائمة متطلبات الشواهد الرسمية المقررة لهذا المؤشر (Evidence Requirements)
    const reqContainer = document.getElementById('score-evidence-requirements-container');
    const evidenceReqs = indicator.evidenceRequirements || [];

    if (reqContainer) {
      if (evidenceReqs.length === 0) {
        reqContainer.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">لا توجد متطلبات شواهد مسجلة لهذا المؤشر.</span>';
      } else {
        reqContainer.innerHTML = evidenceReqs.map(req => `
          <div class="evidence-req-item">
            <div>
              <strong style="color: #1e293b;">${req.title}</strong>
              ${req.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${req.description}</div>` : ''}
            </div>
            <span class="badge ${req.required ? 'badge-yellow' : 'badge-gray'}">${req.required ? 'إلزامي' : 'اختياري'}</span>
          </div>
        `).join('');
      }
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

  selectScoreCard(scoreVal, descriptorId) {
    const cards = document.querySelectorAll('#score-descriptor-cards .descriptor-card');
    cards.forEach(c => c.classList.remove('selected'));

    const activeCard = document.getElementById(`desc-card-${scoreVal}`);
    if (activeCard) {
      activeCard.classList.add('selected');
    }

    document.getElementById('selected-score-value').value = scoreVal;
    document.getElementById('selected-descriptor-id').value = descriptorId || '';
    this.clearErrors(['score']);
  },

  closeScoringModal() {
    const modal = document.getElementById('modal-scoring');
    if (modal) modal.classList.add('hidden');
    this.state.currentIndicator = null;
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

    // قراءة التقدير من البطاقة المحددة
    const valInput = document.getElementById('selected-score-value');
    const descIdInput = document.getElementById('selected-descriptor-id');

    if (!valInput || valInput.value === '' || valInput.value === null) {
      document.getElementById('err-score').textContent = 'يرجى النقر على إحدى بطاقات الواصفات الأربع لاختيار التقدير.';
      return;
    }

    const selectedScore = parseInt(valInput.value);
    const scoreDescriptorId = descIdInput.value ? parseInt(descIdInput.value) : null;

    // قراءة أدوات التحقق
    const toolCheckboxes = document.getElementsByName('verificationToolIds');
    const verificationToolIds = [];
    toolCheckboxes.forEach(cb => {
      if (cb.checked) verificationToolIds.push(parseInt(cb.value));
    });

    const textualResult = document.getElementById('score-textual-result').value.trim();

    const body = {
      score: selectedScore,
      scoreDescriptorId: scoreDescriptorId,
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

    this.loadEvidences(indicator);
    modal.classList.remove('hidden');
  },

  closeEvidencesModal() {
    const modal = document.getElementById('modal-evidences');
    if (modal) modal.classList.add('hidden');
    this.state.currentIndicator = null;
  },

  async loadEvidences(indicatorOrResultId) {
    const container = document.getElementById('evidences-list-container');
    if (!container) return;
    container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">جارِ تحميل قائمة الشواهد...</span>';

    const evalId = this.getEvaluationId();
    const ind = typeof indicatorOrResultId === 'object' && indicatorOrResultId !== null
      ? indicatorOrResultId
      : (this.state.currentIndicator || { indicatorId: indicatorOrResultId, resultId: indicatorOrResultId });

    let url = '';
    if (evalId && ind.indicatorId) {
      url = `/evaluations/${evalId}/indicators/${ind.indicatorId}/evidences`;
    } else if (ind.resultId) {
      url = `/evaluation-results/${ind.resultId}/evidences`;
    } else {
      container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">لا يمكن تحديد مسار الشواهد.</span>';
      return;
    }

    const res = await this.request(url);
    if (!res.ok) {
      container.innerHTML = `<span style="color: red; font-size: 0.85rem;">${res.message}</span>`;
      return;
    }

    this.state.currentEvidences = res.data || [];
    if (this.state.currentEvidences.length === 0) {
      container.innerHTML = '<div class="alert alert-info" style="font-size: 0.85rem; margin: 0;">لا توجد شواهد مرفوعة لهذا المؤشر حتى الآن. يمكنك إضافة شاهد أو أكثر باستخدام النموذج أدناه.</div>';
      return;
    }

    const canManageEvidence = this.hasPermission('evidence.manage');
    const typeLabels = {
      minutes: 'محضر',
      plan: 'خطة',
      record: 'سجل',
      report: 'تقرير',
      board: 'لوحة',
      image: 'صورة',
      other: 'أخرى',
    };
    const statusBadges = {
      Draft: '<span class="badge badge-gray">مسودة</span>',
      Completed: '<span class="badge badge-blue">مكتمل</span>',
      Audited: '<span class="badge badge-green">مدقق ومقبول ✅</span>',
    };

    container.innerHTML = this.state.currentEvidences.map((ev, index) => {
      const versions = ev.versions || [];
      const currentVer = versions.find(v => v.current) || versions[0] || {};
      const attachment = currentVer?.attachments?.[0];
      const versionId = currentVer.evidenceVersionId || currentVer.versionId || 1;

      return `
        <div class="card" style="margin-bottom: 0.75rem; padding: 0.85rem; background: #fff; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">
            <div>
              <span class="badge badge-gray" style="font-weight: 700; margin-left: 0.35rem;">#${index + 1}</span>
              <strong style="color: #0f172a; font-size: 0.95rem;">📄 ${ev.title}</strong>
            </div>
            <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
              <span class="badge badge-gray" style="border: 1px solid #cbd5e1;">🏷️ ${typeLabels[ev.evidenceType] || ev.evidenceType || 'أخرى'}</span>
              ${statusBadges[ev.status] || `<span class="badge badge-gray">${ev.status || 'Draft'}</span>`}
              <span class="badge badge-blue">النسخة النشطة v${currentVer?.versionNo || 1}</span>
            </div>
          </div>
          ${ev.description ? `<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.35rem;">${ev.description}</p>` : ''}
          ${ev.justification ? `<p style="font-size: 0.82rem; color: var(--primary); margin-bottom: 0.35rem;"><strong>المبرر:</strong> ${ev.justification}</p>` : ''}

          ${ev.reviewerNotes ? `
            <div style="background: #f1f5f9; padding: 0.5rem 0.75rem; border-radius: 4px; border-right: 3px solid #0284c7; margin-top: 0.5rem; margin-bottom: 0.5rem; font-size: 0.8rem;">
              <strong>📝 ملاحظات المراجع:</strong> ${ev.reviewerNotes}
              ${ev.reviewedBy ? `<span style="color: var(--text-muted); font-size: 0.75rem;"> (بواسطة: ${ev.reviewedBy.fullName || ev.reviewedBy.userId})</span>` : ''}
              ${ev.reviewedAt ? `<span style="color: var(--text-muted); font-size: 0.75rem;"> - ${new Date(ev.reviewedAt).toLocaleDateString('ar-EG')}</span>` : ''}
            </div>
          ` : ''}
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.82rem; color: #334155;">
              📎 الملف المعتمد: <strong>${attachment?.fileName || 'وثيقة الشاهد'}</strong> 
              ${attachment?.fileSize ? `<span style="color: var(--text-muted); font-size: 0.75rem;">(${Math.round(attachment.fileSize / 1024)} KB)</span>` : ''}
            </div>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              ${attachment ? `
                <button class="btn btn-sm btn-secondary" onclick="App.downloadEvidenceVersion(${ev.evidenceId}, ${versionId}, '${attachment.fileName}')">
                  ⬇️ تنزيل الملف
                </button>
              ` : ''}

              ${canManageEvidence ? `
                <button class="btn btn-sm btn-primary" onclick="App.triggerNewVersionUpload(${ev.evidenceId})">
                  + رفع نسخة جديدة (Revision)
                </button>
              ` : ''}
            </div>
          </div>

          ${canManageEvidence ? `
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border);">
              <button class="btn btn-sm btn-secondary" onclick="App.promptClassify(${ev.evidenceId}, '${ev.evidenceType || 'other'}')">
                🏷️ تصنيف
              </button>
              <button class="btn btn-sm btn-secondary" onclick="App.promptUpdateStatus(${ev.evidenceId}, '${ev.status || 'Draft'}')">
                🔄 الحالة
              </button>
              <button class="btn btn-sm btn-secondary" onclick="App.promptLinkIndicator(${ev.evidenceId}, ${ev.indicatorId})">
                🔗 ربط بمؤشر
              </button>
              <button class="btn btn-sm btn-secondary" onclick="App.promptReviewNotes(${ev.evidenceId})">
                📝 ملاحظة مراجع
              </button>
            </div>
          ` : ''}

          <!-- تفاصيل النسخ التاريخية السابقة إن وجدت -->
          ${versions.length > 1 ? `
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 0.35rem;">
              ⏳ النسخ التاريخية السابقة لهذا الشاهد: 
              ${versions.filter(v => !v.current).map(v => `<span class="badge badge-gray" style="margin-left: 0.25rem;">v${v.versionNo}</span>`).join('')}
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
    if (!ind) return;

    this.clearErrors(['ev-title', 'ev-file']);
    const alertEl = document.getElementById('ev-modal-alert');
    alertEl.classList.add('hidden');

    const title = document.getElementById('ev-title').value.trim();
    const description = document.getElementById('ev-desc').value.trim();
    const justification = document.getElementById('ev-justification').value.trim();
    const evidenceType = document.getElementById('ev-type')?.value || 'other';
    const fileInput = document.getElementById('ev-file');

    if (!fileInput.files || fileInput.files.length === 0) {
      document.getElementById('err-ev-file').textContent = 'الملف المرفق إلزامي.';
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (justification) formData.append('justification', justification);
    formData.append('evidence_type', evidenceType);
    formData.append('file', fileInput.files[0]);

    const evalId = this.getEvaluationId();
    let url = '';
    if (evalId && ind.indicatorId) {
      url = `/evaluations/${evalId}/indicators/${ind.indicatorId}/evidences`;
    } else if (ind.resultId) {
      url = `/evaluation-results/${ind.resultId}/evidences`;
    } else {
      alertEl.textContent = 'تعذر تحديد المؤشر أو ملف التقييم.';
      alertEl.classList.remove('hidden');
      return;
    }

    const res = await this.request(url, {
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
        alertEl.textContent = res.message || 'فشل إضافة الشاهد.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    document.getElementById('form-upload-evidence').reset();
    this.showAlert('تم إضافة الشاهد ورفع نسخته الأولى بنجاح.', 'success');
    this.loadEvidences(ind);
    if (this.state.currentEvaluation?.evaluationId) {
      this.loadStandardsTree(this.state.currentEvaluation.evaluationId);
    }
    if (this.state.currentScreen === 'evidence-inventory') {
      this.loadEvidenceInventory();
    }
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
      this.loadEvidences(this.state.currentIndicator);
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
  // الشريحة 5: إدارة وتنظيم وتصنيف وتدقيق الشواهد (Evidence Organization Actions)
  // ---------------------------------------------------------------------------
  async promptClassify(evidenceId, currentType) {
    const types = [
      { id: 'minutes', label: 'محضر اجتماع / زيارة (Minutes)' },
      { id: 'plan', label: 'خطة معتمدة (Plan)' },
      { id: 'record', label: 'سجل رسمي / كشف (Record)' },
      { id: 'report', label: 'تقرير دوري / ختامي (Report)' },
      { id: 'board', label: 'لوحة إعلانية / إرشادية (Board)' },
      { id: 'image', label: 'صورة ميدانية توثيقية (Image)' },
      { id: 'other', label: 'أخرى (Other)' },
    ];
    const promptMsg = 'اختر رقم التصنيف اليدوي للشاهد:\n' + types.map((t, idx) => `${idx + 1}. ${t.label}`).join('\n');
    const choice = prompt(promptMsg, '1');
    if (!choice) return;
    const selected = types[parseInt(choice) - 1];
    if (!selected) {
      alert('اختيار غير صالح.');
      return;
    }
    const res = await this.request(`/evidences/${evidenceId}/classify`, {
      method: 'PATCH',
      body: JSON.stringify({ evidence_type: selected.id }),
    });
    if (res.ok) {
      this.showAlert(`تم تصنيف الشاهد كـ [${selected.label}] بنجاح.`, 'success');
      if (this.state.currentIndicator) {
        this.loadEvidences(this.state.currentIndicator);
      }
      if (this.state.currentScreen === 'evidence-inventory') {
        this.loadEvidenceInventory();
      }
    } else {
      this.showAlert(res.message || 'فشل تصنيف الشاهد.', 'error');
    }
  },

  async promptUpdateStatus(evidenceId, currentStatus) {
    const statuses = [
      { id: 'Draft', label: 'مسودة (Draft)' },
      { id: 'Completed', label: 'مكتمل (Completed)' },
      { id: 'Audited', label: 'مدقق ومقبول (Audited)' },
    ];
    const promptMsg = 'اختر رقم حالة تدقيق الشاهد:\n' + statuses.map((s, idx) => `${idx + 1}. ${s.label}`).join('\n');
    const choice = prompt(promptMsg, '2');
    if (!choice) return;
    const selected = statuses[parseInt(choice) - 1];
    if (!selected) {
      alert('اختيار غير صالح.');
      return;
    }
    const res = await this.request(`/evidences/${evidenceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: selected.id }),
    });
    if (res.ok) {
      this.showAlert(`تم تحديث حالة الشاهد إلى [${selected.label}] بنجاح.`, 'success');
      if (this.state.currentIndicator) {
        this.loadEvidences(this.state.currentIndicator);
      }
      if (this.state.currentScreen === 'evidence-inventory') {
        this.loadEvidenceInventory();
      }
    } else {
      this.showAlert(res.message || 'فشل تحديث حالة الشاهد.', 'error');
    }
  },

  async promptLinkIndicator(evidenceId, currentIndicatorId) {
    this.openLinkEvidenceModal(evidenceId, currentIndicatorId);
  },

  async openLinkEvidenceModal(evidenceId, currentIndicatorId) {
    const modal = document.getElementById('modal-link-evidence');
    if (!modal) return;

    this.state.linkingEvidence = { evidenceId, currentIndicatorId };
    const alertEl = document.getElementById('link-ev-alert');
    if (alertEl) alertEl.classList.add('hidden');

    const searchInput = document.getElementById('link-ev-search');
    if (searchInput) searchInput.value = '';

    // العثور على عنوان الشاهد الحالي
    const ev = (this.state.currentEvidences || []).find(e => e.evidenceId === evidenceId);
    const titleEl = document.getElementById('link-ev-title');
    if (titleEl) titleEl.textContent = ev ? ev.title : `شاهد #${evidenceId}`;

    const currentIndEl = document.getElementById('link-ev-current-indicator');
    if (currentIndEl) currentIndEl.textContent = this.state.currentIndicator?.code ? `${this.state.currentIndicator.code}: ${this.state.currentIndicator.name}` : `مؤشر #${currentIndicatorId}`;

    // جلب شجرة المؤشرات لملء القائمة المنسدلة
    const evalId = this.getEvaluationId();
    if (!this.state.cachedIndicatorsList) {
      const res = await this.request(`/evaluations/${evalId}/standards-tree`);
      const list = [];
      if (res.ok && res.data?.standards) {
        for (const std of res.data.standards) {
          for (const sub of (std.subStandards || [])) {
            for (const ind of (sub.indicators || [])) {
              list.push({
                indicatorId: ind.indicatorId,
                code: ind.code,
                name: ind.name,
                standardName: std.name,
              });
            }
          }
        }
      }
      this.state.cachedIndicatorsList = list;
    }

    this.renderLinkIndicatorOptions();
    modal.classList.remove('hidden');
  },

  renderLinkIndicatorOptions(filterText = '') {
    const select = document.getElementById('link-ev-target-select');
    if (!select) return;

    const list = this.state.cachedIndicatorsList || [];
    const term = filterText.toLowerCase().trim();
    const currentIndId = this.state.linkingEvidence?.currentIndicatorId;

    const filtered = list.filter(ind => {
      if (!term) return true;
      return ind.code.toLowerCase().includes(term) || ind.name.toLowerCase().includes(term) || ind.standardName.toLowerCase().includes(term);
    });

    select.innerHTML = filtered.map(ind => {
      const isCurrent = ind.indicatorId === currentIndId;
      return `<option value="${ind.indicatorId}" ${isCurrent ? 'disabled style="color: #94a3b8;"' : ''}>
        ${ind.code} - ${ind.name} ${isCurrent ? '(المؤشر الحالي)' : ''}
      </option>`;
    }).join('');

    if (select.options.length > 0 && !select.value) {
      for (let i = 0; i < select.options.length; i++) {
        if (!select.options[i].disabled) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  },

  filterLinkIndicatorOptions(term) {
    this.renderLinkIndicatorOptions(term);
  },

  closeLinkEvidenceModal() {
    const modal = document.getElementById('modal-link-evidence');
    if (modal) modal.classList.add('hidden');
    this.state.linkingEvidence = null;
  },

  async submitLinkEvidence() {
    const alertEl = document.getElementById('link-ev-alert');
    if (!this.state.linkingEvidence) return;

    const select = document.getElementById('link-ev-target-select');
    const targetId = select ? parseInt(select.value) : null;

    if (!targetId || isNaN(targetId)) {
      if (alertEl) {
        alertEl.textContent = 'يرجى اختيار المؤشر المستهدف من القائمة.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    const evidenceId = this.state.linkingEvidence.evidenceId;
    const res = await this.request(`/evidences/${evidenceId}/link-indicator`, {
      method: 'POST',
      body: JSON.stringify({ indicator_id: targetId }),
    });

    if (!res.ok) {
      if (alertEl) {
        alertEl.textContent = res.message || 'فشل نقل الشاهد للمؤشر المحدد.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    this.closeLinkEvidenceModal();
    this.showAlert(res.message || 'تم نقل وربط الشاهد بالمؤشر المستهدف بنجاح.', 'success');

    if (this.state.currentIndicator) {
      this.loadEvidences(this.state.currentIndicator);
    }
    if (this.state.currentScreen === 'evidence-inventory') {
      this.loadEvidenceInventory();
    }
  },

  async promptReviewNotes(evidenceId) {
    const note = prompt('أدخل ملاحظات المراجع / المقيم على كفاية الشاهد:');
    if (!note || note.trim() === '') return;
    const res = await this.request(`/evidences/${evidenceId}/review-notes`, {
      method: 'POST',
      body: JSON.stringify({ notes: note.trim() }),
    });
    if (res.ok) {
      this.showAlert('تمت إضافة ملاحظات المراجع بنجاح.', 'success');
      if (this.state.currentIndicator) {
        this.loadEvidences(this.state.currentIndicator);
      }
      if (this.state.currentScreen === 'evidence-inventory') {
        this.loadEvidenceInventory();
      }
    } else {
      this.showAlert(res.message || 'فشل تسجيل ملاحظات المراجع.', 'error');
    }
  },

  // ---------------------------------------------------------------------------
  // الشاشة 15: جرد وحصر الشواهد التفصيلي (Evidence Inventory)
  // ---------------------------------------------------------------------------
  async loadEvidenceInventory() {
    const evalId = this.getEvaluationId();
    const container = document.getElementById('evinv-standards-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">جارِ جرد وحصر الشواهد التفصيلي...</div>';

    const res = await this.request(`/evaluations/${evalId}/evidence-inventory`);
    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">${res.message || 'تعذر تحميل جرد الشواهد.'}</div>`;
      return;
    }

    const data = res.data;
    this.state.evidenceInventory = data;
    this.updateDevToolsVisibility();

    // تعبئة بطاقات الـ KPI
    const isComplete = data.inventoryStatus === 'Complete';
    const statusCard = document.getElementById('evinv-card-status');
    const statusVal = document.getElementById('evinv-kpi-status');
    const statusSub = document.getElementById('evinv-kpi-status-sub');

    if (statusCard && statusVal && statusSub) {
      if (isComplete) {
        statusCard.style.borderRightColor = '#10b981';
        statusVal.style.color = '#10b981';
        statusVal.textContent = 'مكتمل ✅';
        statusSub.textContent = 'كافة المؤشرات مستوفية الشواهد';
      } else {
        statusCard.style.borderRightColor = '#f59e0b';
        statusVal.style.color = '#f59e0b';
        statusVal.textContent = 'ناقص ⚠️';
        statusSub.textContent = `${data.summary?.indicatorsMissingEvidence || 0} مؤشر بحاجة لاستكمال`;
      }
    }

    const elSufficient = document.getElementById('evinv-kpi-sufficient');
    if (elSufficient) elSufficient.textContent = data.summary?.indicatorsWithSufficientEvidence || 0;

    const elMissing = document.getElementById('evinv-kpi-missing');
    if (elMissing) elMissing.textContent = data.summary?.indicatorsMissingEvidence || 0;

    const elDocs = document.getElementById('evinv-kpi-total-docs');
    if (elDocs) elDocs.textContent = data.summary?.totalEvidencesUploaded || 0;

    const elDraftDocs = document.getElementById('evinv-kpi-draft-docs');
    if (elDraftDocs) elDraftDocs.textContent = data.summary?.totalDraftEvidences || 0;

    const btnSubmit = document.getElementById('btn-evinv-submit');
    if (btnSubmit) {
      btnSubmit.style.display = this.hasPermission('evaluations.submit') ? 'inline-block' : 'none';
    }

    // تعبئة توزيع الأنواع
    const typeLabels = { minutes: 'محاضر', plan: 'خطط', record: 'سجلات', report: 'تقارير', board: 'لوحات', image: 'صور', other: 'أخرى' };
    const typesDiv = document.getElementById('evinv-types-breakdown');
    if (typesDiv && data.summary?.byType) {
      typesDiv.innerHTML = Object.entries(data.summary.byType).map(([k, count]) => `
        <span class="badge badge-gray" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; border: 1px solid #cbd5e1;">
          ${typeLabels[k] || k}: <strong>${count}</strong>
        </span>
      `).join('');
    }

    // تعبئة توزيع الحالات
    const statusLabels = { Draft: 'مسودة', Completed: 'مكتمل', Audited: 'مدقق ومقبول' };
    const statusesDiv = document.getElementById('evinv-statuses-breakdown');
    if (statusesDiv && data.summary?.byStatus) {
      statusesDiv.innerHTML = Object.entries(data.summary.byStatus).map(([k, count]) => `
        <span class="badge ${k === 'Audited' ? 'badge-green' : (k === 'Completed' ? 'badge-blue' : 'badge-gray')}" style="padding: 0.35rem 0.6rem; font-size: 0.8rem;">
          ${statusLabels[k] || k}: <strong>${count}</strong>
        </span>
      `).join('');
    }

    this.renderEvidenceInventory(data.standards || []);
  },

  renderEvidenceInventory(standards, filter = 'all') {
    const container = document.getElementById('evinv-standards-container');
    if (!container) return;

    if (!standards || standards.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 1.5rem;">لا توجد معايير ومؤشرات متاحة.</div>';
      return;
    }

    container.innerHTML = standards.map(std => {
      let filteredIndicators = std.indicators || [];
      if (filter === 'missing') {
        filteredIndicators = filteredIndicators.filter(i => !i.isSufficient);
      } else if (filter === 'sufficient') {
        filteredIndicators = filteredIndicators.filter(i => i.isSufficient);
      }

      if (filteredIndicators.length === 0) return '';

      return `
        <div class="card" style="margin-bottom: 1.25rem; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="font-size: 1.05rem; color: var(--primary); margin: 0;">${std.standardName} (${std.standardCode})</h3>
            <span class="badge badge-blue">${filteredIndicators.length} مؤشر</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${filteredIndicators.map(ind => `
              <div style="background: #f8fafc; border: 1px solid ${(ind.isSufficient || ind.status === 'Completed') ? '#e2e8f0' : '#fecaca'}; border-radius: 6px; padding: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <div>
                    <strong style="color: var(--primary);">${ind.indicatorCode}</strong>: ${ind.indicatorName}
                    <span style="font-size: 0.75rem; color: var(--text-muted); margin-right: 0.5rem;">[${ind.domainName}]</span>
                  </div>
                  <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
                    ${(ind.isSufficient || ind.status === 'Completed') ? '<span class="badge badge-green">مستوفٍ ✅</span>' : '<span class="badge badge-red">ناقص الشواهد ⚠️</span>'}
                    <span class="badge badge-gray">صالح: ${ind.validEvidenceCount} / مسودة: ${ind.draftEvidenceCount || 0} / مطلوب: ${ind.mandatoryRequiredCount}</span>
                    <button class="btn btn-sm btn-primary" onclick="App.openIndicatorEvidencesModal(${ind.indicatorId}, '${ind.indicatorCode}', '${encodeURIComponent(ind.indicatorName)}')">
                      📁 إدارة الشواهد
                    </button>
                  </div>
                </div>

                ${ind.evidences && ind.evidences.length > 0 ? `
                  <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;">
                    ${ind.evidences.map(ev => `
                      <span class="badge ${ev.status === 'Audited' ? 'badge-green' : (ev.status === 'Completed' ? 'badge-blue' : 'badge-gray')}" style="font-size: 0.75rem;">
                        📄 ${ev.title} (${ev.evidenceType || 'أخرى'}) [${ev.status}]
                      </span>
                    `).join('')}
                  </div>
                ` : `
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">لا توجد شواهد مرفوعة لهذا المؤشر بعد.</div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('') || '<div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">لا توجد مؤشرات تطابق الفلتر المحدد.</div>';
  },

  filterEvidenceInventory(filter) {
    const btnAll = document.getElementById('btn-evinv-filter-all');
    const btnMissing = document.getElementById('btn-evinv-filter-missing');
    const btnSufficient = document.getElementById('btn-evinv-filter-sufficient');

    [btnAll, btnMissing, btnSufficient].forEach(b => {
      if (b) {
        b.className = 'btn btn-sm btn-secondary';
      }
    });

    if (filter === 'missing') {
      if (btnMissing) btnMissing.className = 'btn btn-sm btn-primary';
    } else if (filter === 'sufficient') {
      if (btnSufficient) btnSufficient.className = 'btn btn-sm btn-primary';
    } else {
      if (btnAll) btnAll.className = 'btn btn-sm btn-primary';
    }

    if (this.state.evidenceInventory?.standards) {
      this.renderEvidenceInventory(this.state.evidenceInventory.standards, filter);
    }
  },

  async openIndicatorEvidencesModal(indicatorId, code, encodedName) {
    const name = decodeURIComponent(encodedName);
    const evalId = this.getEvaluationId();
    // جلب النتيجة للمؤشر لفتح المودال
    const res = await this.request(`/evaluations/${evalId}/standards-tree`);
    let resultId = null;
    if (res.ok && res.data?.standards) {
      for (const std of res.data.standards) {
        for (const sub of (std.subStandards || [])) {
          for (const ind of (sub.indicators || [])) {
            if (ind.indicatorId === indicatorId && ind.resultId) {
              resultId = ind.resultId;
              break;
            }
          }
        }
      }
    }
    this.openEvidencesModal({ indicatorId, code, name, resultId: resultId || indicatorId });
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

  // ---------------------------------------------------------------------------
  // شاشة مراجعة المعايير والمؤشرات والواصفات (Standards Review Screen - Read Only)
  // ---------------------------------------------------------------------------
  async loadStandardsReview() {
    const container = document.getElementById('standards-review-content');
    if (!container) return;

    if (!this.state.standardsTree) {
      container.innerHTML = '<div class="card" style="text-align: center;">جارِ جلب شجرة المعايير والمؤشرات والواصفات...</div>';
      
      if (!this.state.currentEvaluation) {
        const evRes = await this.request('/evaluations');
        if (evRes.ok && evRes.data && evRes.data.length > 0) {
          this.state.currentEvaluation = evRes.data[0];
        }
      }

      if (this.state.currentEvaluation) {
        const treeRes = await this.request(`/evaluations/${this.state.currentEvaluation.evaluationId}/standards-tree`);
        if (treeRes.ok) {
          this.state.standardsTree = treeRes.data;
        } else {
          container.innerHTML = `<div class="card" style="color: red;">${treeRes.message || 'فشل جلب المعايير.'}</div>`;
          return;
        }
      } else {
        container.innerHTML = '<div class="card" style="color: red;">لا يوجد ملف تقييم متاح لاستعراض شجرة معاييره.</div>';
        return;
      }
    }

    this.renderStandardsReview();
  },

  renderStandardsReview() {
    const container = document.getElementById('standards-review-content');
    if (!container || !this.state.standardsTree) return;

    const data = this.state.standardsTree;
    const standards = data.standards || [];

    if (standards.length === 0) {
      container.innerHTML = '<div class="card" style="text-align: center;">لا توجد معايير مسجلة في هذا الإصدار.</div>';
      return;
    }

    container.innerHTML = standards.map((std, sIdx) => `
      <div class="review-standard-card" id="rev-std-card-${sIdx}">
        <div class="review-standard-header" onclick="App.toggleAccordion('rev-std-body-${sIdx}')">
          <div>
            <span>${std.code} — ${std.name}</span>
            ${std.description ? `<div style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted); margin-top: 0.2rem;">${std.description}</div>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            الوزن: ${std.weight}% | ${std.subStandards?.length || 0} مجالات فرعية ▾
          </div>
        </div>

        <div id="rev-std-body-${sIdx}" class="review-standard-body">
          ${(std.subStandards || []).map((sub, subIdx) => `
            <div style="border-bottom: 1px solid var(--border);" id="rev-sub-card-${sIdx}-${subIdx}">
              <div class="review-substandard-header" onclick="App.toggleAccordion('rev-sub-body-${sIdx}-${subIdx}')">
                <div>
                  <span>${sub.code} — ${sub.name}</span>
                  ${sub.description ? `<div style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">${sub.description}</div>` : ''}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  ${sub.indicators?.length || 0} مؤشرات ▾
                </div>
              </div>

              <div id="rev-sub-body-${sIdx}-${subIdx}" class="review-substandard-body">
                ${(sub.indicators || []).map(ind => `
                  <div class="review-indicator-card" 
                       id="rev-ind-${ind.indicatorId}" 
                       data-code="${ind.code}" 
                       data-name="${ind.name}" 
                       data-desc="${ind.description || ''}">
                    <!-- رأس المؤشر -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                      <div>
                        <strong style="color: var(--primary); font-size: 0.95rem;">${ind.code} — ${ind.name}</strong>
                        <div style="font-size: 0.85rem; color: #475569; margin-top: 0.25rem; line-height: 1.4;">
                          ${ind.description || 'لا يوجد وصف للمؤشر'}
                        </div>
                      </div>
                      <div style="text-align: left; font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;">
                        الوزن: ${ind.weight || 1} | الحالة: <span class="badge badge-green">${ind.status}</span>
                      </div>
                    </div>

                    <!-- الواصفات الأربع كاملة -->
                    <div style="margin-top: 0.75rem;">
                      <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">
                        سلم الواصفات المعيارية الأربع (0 - 3):
                      </div>
                      <div class="descriptor-cards-grid">
                        ${(ind.scoreDescriptors || []).sort((a,b)=>(a.scoreValue??a.displayOrder)-(b.scoreValue??b.displayOrder)).map(d => `
                          <div class="descriptor-card" style="cursor: default;">
                            <div class="card-score-badge">
                              <span>المستوى: ${d.scoreValue}</span>
                              <span class="badge ${d.scoreValue >= 2 ? 'badge-green' : (d.scoreValue === 1 ? 'badge-yellow' : 'badge-red')}">${d.label}</span>
                            </div>
                            <div class="card-desc-text">${d.description || 'لا يوجد نص واصفة معتمد'}</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>

                    <!-- أدوات التحقق ومتطلبات الشواهد -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem; margin-top: 0.75rem; padding-top: 0.6rem; border-top: 1px dashed var(--border);">
                      <!-- أدوات التحقق -->
                      <div>
                        <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">
                          أدوات التحقق المعتمدة:
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                          ${(ind.verificationTools || []).length > 0 
                            ? (ind.verificationTools || []).map(t => `
                              <div class="tool-item-row" style="font-size: 0.8rem;">
                                <div style="display: flex; justify-content: space-between;">
                                  <strong>${t.name} (${t.toolType})</strong>
                                  <span class="badge ${t.required ? 'badge-red' : 'badge-gray'}" style="font-size: 0.65rem;">${t.required ? 'إلزامية *' : 'اختيارية'}</span>
                                </div>
                                ${t.usageGuidance ? `<div class="tool-item-guidance">💡 ${t.usageGuidance}</div>` : ''}
                              </div>
                            `).join('')
                            : '<span style="font-size: 0.75rem; color: var(--text-muted);">لا توجد أدوات تحقق مقررة.</span>'}
                        </div>
                      </div>

                      <!-- متطلبات الشواهد -->
                      <div>
                        <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">
                          متطلبات الشواهد والأدلة الرسمية:
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                          ${(ind.evidenceRequirements || []).length > 0
                            ? (ind.evidenceRequirements || []).map(r => `
                              <div class="evidence-req-item" style="font-size: 0.8rem;">
                                <div>
                                  <strong>${r.title}</strong>
                                  ${r.description ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${r.description}</div>` : ''}
                                </div>
                                <span class="badge ${r.required ? 'badge-yellow' : 'badge-gray'}" style="font-size: 0.65rem;">${r.required ? 'إلزامي' : 'اختياري'}</span>
                              </div>
                            `).join('')
                            : '<span style="font-size: 0.75rem; color: var(--text-muted);">لا توجد متطلبات شواهد مسجلة.</span>'}
                        </div>
                      </div>
                    </div>

                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  filterStandardsReview(query) {
    const q = (query || '').trim().toLowerCase();
    const indCards = document.querySelectorAll('.review-indicator-card');
    let visibleCount = 0;

    indCards.forEach(card => {
      const code = (card.getAttribute('data-code') || '').toLowerCase();
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const desc = (card.getAttribute('data-desc') || '').toLowerCase();

      if (!q || code.includes(q) || name.includes(q) || desc.includes(q)) {
        card.style.display = 'block';
        visibleCount++;
        // فتح المجال والمعيار الأب تلقائياً
        const subBody = card.closest('.review-substandard-body');
        if (subBody) subBody.classList.remove('hidden');
        const stdBody = card.closest('.review-standard-body');
        if (stdBody) stdBody.classList.remove('hidden');
      } else {
        card.style.display = 'none';
      }
    });

    const meta = document.getElementById('standards-review-search-meta');
    if (meta) {
      meta.textContent = q 
        ? `نتائج البحث: تم العثور على ${visibleCount} مؤشراً مطابقاً لكلمة البحث «${q}».`
        : 'عرض كافة المؤشرات الـ 109 ضمن 14 مجالاً فرعياً و 7 معايير رئيسية.';
    }
  },

  toggleAllReviewStandards(expand) {
    const stdBodies = document.querySelectorAll('.review-standard-body');
    stdBodies.forEach(b => {
      if (expand) b.classList.remove('hidden');
      else b.classList.add('hidden');
    });

    const subBodies = document.querySelectorAll('.review-substandard-body');
    subBodies.forEach(b => {
      if (expand) b.classList.remove('hidden');
      else b.classList.add('hidden');
    });
  },


  // ===========================================================================
  // دوال الشريحة 4: التقارير والتحليلات وحساب النتائج (Slice 4 Logic)
  // ===========================================================================

  getSchoolId() {
    return this.state.currentEvaluation?.school?.schoolId
      || this.state.currentEvaluation?.school_id
      || this.state.user?.school?.schoolId
      || this.state.user?.school_id
      || 1;
  },

  getEvaluationId() {
    return this.state.currentEvaluation?.evaluationId
      || this.state.currentEvaluation?.evaluation_id
      || (this.state.evaluations?.[0]?.evaluationId)
      || 1;
  },

  openResultsForEvaluation(evalId, schoolId) {
    const ev = this.state.evaluations.find(e => e.evaluationId === evalId);
    if (ev) this.state.currentEvaluation = ev;
    this.navTo('assessment-results');
  },

  openEvidenceForEvaluation(evalId, schoolId) {
    const ev = this.state.evaluations.find(e => e.evaluationId === evalId);
    if (ev) this.state.currentEvaluation = ev;
    this.navTo('evidence-summary');
  },

  openExportForEvaluation(evalId, schoolId) {
    const ev = this.state.evaluations.find(e => e.evaluationId === evalId);
    if (ev) this.state.currentEvaluation = ev;
    this.navTo('export-report');
  },

  openStandardResult(standardId) {
    this.state.currentStandardId = standardId;
    this.navTo('standard-result');
  },

  // ---------------------------------------------------------------------------
  // الشاشة 10: لوحة معلومات المدرسة الموحدة (Dashboard)
  // ---------------------------------------------------------------------------
  async loadDashboard() {
    const schoolId = this.getSchoolId();
    const res = await this.request(`/schools/${schoolId}/dashboard`);

    if (!res.ok) {
      this.showAlert(res.message || 'تعذر تحميل لوحة معلومات المدرسة.', 'error');
      return;
    }

    const data = res.data;
    const school = data.school || {};
    const assessment = data.assessment;
    const evidence = data.evidence_overview;
    const plans = data.improvement_plans_overview;

    // تعبئة بطاقة المدرسة
    document.getElementById('dash-school-name').textContent = school.school_name || 'المدرسة';
    document.getElementById('dash-school-meta').textContent = 
      `المرحلة: ${school.educational_stage || '-'} | المديرية: ${school.educational_district || '-'} | المحافظة: ${school.governorate || '-'} | الحالة: ${school.status || 'Active'}`;

    // KPI 1: التقييم
    const kpiScore = document.getElementById('dash-kpi-score');
    const kpiScoreSub = document.getElementById('dash-kpi-score-sub');
    const kpiLevel = document.getElementById('dash-kpi-level');
    const kpiLevelSub = document.getElementById('dash-kpi-level-sub');

    if (assessment) {
      if (assessment.is_complete) {
        kpiScore.textContent = `${assessment.final_score}%`;
        kpiScoreSub.textContent = `مكتمل ومقفل | العام الدراسي: ${assessment.academic_year || '-'}`;
        kpiLevel.textContent = assessment.performance_level?.label || 'متميز';
        kpiLevelSub.textContent = 'المستوى العام المعتمد';
      } else {
        kpiScore.textContent = `${assessment.completion_percentage}%`;
        kpiScoreSub.textContent = `قيد الإجراء (${assessment.evaluated_indicators} من ${assessment.total_indicators} مؤشر)`;
        kpiLevel.textContent = 'قيد الرصد ⏳';
        kpiLevelSub.textContent = `متبقي ${assessment.missing_indicators} مؤشر`;
      }
    } else {
      kpiScore.textContent = 'لا يوجد';
      kpiScoreSub.textContent = 'لم تبدأ الدورة بعد';
      kpiLevel.textContent = '-';
      kpiLevelSub.textContent = '-';
    }

    // KPI 2: الشواهد
    const kpiEvidence = document.getElementById('dash-kpi-evidence');
    const kpiEvidenceSub = document.getElementById('dash-kpi-evidence-sub');
    if (evidence) {
      kpiEvidence.textContent = `${evidence.completion_rate}%`;
      kpiEvidenceSub.textContent = `مرفوع ${evidence.total_uploaded_evidences} من ${evidence.total_required_evidences} متطلباً`;
    } else {
      kpiEvidence.textContent = '0%';
      kpiEvidenceSub.textContent = 'لا توجد شواهد مرفوعة';
    }

    // KPI 3: خطط التحسين
    const kpiPlans = document.getElementById('dash-kpi-plans');
    const kpiPlansSub = document.getElementById('dash-kpi-plans-sub');
    if (plans) {
      kpiPlans.textContent = `${plans.total_plans} خطط`;
      kpiPlansSub.textContent = `نشطة: ${plans.in_progress_plans} | مكتملة: ${plans.completed_plans} | متأخرة: ${plans.delayed_plans} ⚠️`;
    } else {
      kpiPlans.textContent = '0';
      kpiPlansSub.textContent = 'لا توجد خطط مسجلة';
    }

    // بناء شبكة المعايير السبعة
    const stdGrid = document.getElementById('dash-standards-grid');
    if (!stdGrid) return;

    if (assessment && assessment.standards_summary && assessment.standards_summary.length > 0) {
      stdGrid.innerHTML = assessment.standards_summary.map(std => {
        const pct = std.percentage || 0;
        const colorCls = pct >= 90 ? 'bg-green' : (pct >= 75 ? 'bg-blue' : (pct >= 50 ? 'bg-yellow' : 'bg-red'));
        const levelBadge = pct >= 90 ? 'badge-green' : (pct >= 75 ? 'badge-blue' : (pct >= 50 ? 'badge-yellow' : 'badge-red'));
        
        return `
          <div class="standard-card-item" onclick="App.openStandardResult('${std.code}')" style="cursor: pointer;">
            <div>
              <div class="std-header">
                <div>
                  <span class="std-code-badge">${std.code}</span>
                  <strong style="font-size: 0.95rem; margin-right: 0.35rem; color: #1e293b;">${std.name}</strong>
                </div>
                <span class="std-weight-tag">الوزن: ${std.weight}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.5rem;">
                <span>الدرجة الخام: <strong>${std.raw_score} / 3.00</strong></span>
                <span>المساهمة: <strong>${std.weighted_score}%</strong></span>
              </div>
              <div class="progress-container">
                <div class="progress-bar-fill ${colorCls}" style="width: ${pct}%;"></div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.8rem;">
              <span class="badge ${levelBadge}">${std.performance_level?.label || 'مستوفٍ'} (${pct}%)</span>
              <span style="color: var(--primary); font-weight: 600;">عرض المؤشرات ⬅️</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      stdGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 1.5rem; text-align: center; color: var(--text-muted); background: #f8fafc; border-radius: 6px;">
          التقييم الحالي قيد الرصد والإجراء. ستظهر مؤشرات المعايير السبعة فور استكمال تقييم مؤشرات كل معيار.
          <br><br>
          <button class="btn btn-sm btn-primary" onclick="App.navTo('standards-tree')">الانتقال لاستمارة التقييم لرصد المؤشرات</button>
        </div>
      `;
    }
  },

  // ---------------------------------------------------------------------------
  // الشاشة 11: نتائج التقييم الشاملة (Assessment Results)
  // ---------------------------------------------------------------------------
  async loadAssessmentResults() {
    const schoolId = this.getSchoolId();
    const evalId = this.getEvaluationId();
    const alertBox = document.getElementById('res-incomplete-alert');
    const bannerBox = document.getElementById('res-summary-banner');
    const stdContainer = document.getElementById('res-standards-container');

    bannerBox.innerHTML = 'جارِ حساب وتحليل نتائج التقييم...';
    stdContainer.innerHTML = '';
    alertBox.classList.add('hidden');

    const res = await this.request(`/schools/${schoolId}/assessments/${evalId}/results`);

    if (!res.ok) {
      bannerBox.innerHTML = '';
      if (res.status === 422) {
        alertBox.classList.remove('hidden');
        alertBox.innerHTML = `
          <strong>تنبيه اكتمال التقييم (القاعدة 8):</strong> ${res.message}<br>
          ${res.errors?.evaluation?.[0] || 'التقييم قيد الإجراء ولم يتم تقييم جميع المؤشرات الـ 109 بعد.'}
          <div style="margin-top: 0.75rem;">
            <button class="btn btn-sm btn-primary" onclick="App.navTo('standards-tree')">
              الانتقال إلى شجرة المعايير لاستكمال رصد المؤشرات
            </button>
          </div>
        `;
      } else {
        alertBox.classList.remove('hidden');
        alertBox.textContent = res.message || 'تعذر حساب نتائج التقييم.';
      }
      return;
    }

    const data = res.data;
    document.getElementById('res-school-title').textContent = `نتائج التقييم الذاتي — ${data.school_name || 'المدرسة'}`;
    document.getElementById('res-eval-meta').textContent = 
      `ملف تقييم رقم: #${data.evaluation_id} | العام الدراسي: ${data.academic_year || '-'} | إجمالي المؤشرات: ${data.total_indicators}`;

    // تعبئة بطاقة النتيجة الإجمالية
    const finalScore = data.final_score || 0;
    const perfLabel = data.performance_level?.label || 'متميز';
    const perfBadge = finalScore >= 90 ? 'badge-green' : (finalScore >= 75 ? 'badge-blue' : (finalScore >= 50 ? 'badge-yellow' : 'badge-red'));

    bannerBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">النتيجة الإجمالية النهائية للمدرسة:</span>
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--primary);">
            ${finalScore}% 
            <span style="font-size: 1rem; font-weight: 600; color: var(--text-muted);">من 100%</span>
          </div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">مستوى الأداء العام:</div>
          <span class="badge ${perfBadge}" style="font-size: 1.1rem; padding: 0.4rem 1rem;">${perfLabel}</span>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">حالة التقييم:</div>
          <span class="badge badge-green">${data.status || 'Completed'} (مكتمل 100%)</span>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${data.is_locked ? '🔒 مقفل نهائياً' : 'مفتوح'}
          </div>
        </div>
      </div>
    `;

    // تعبئة بطاقات المعايير السبعة وقوائم مؤشراتها
    stdContainer.innerHTML = (data.standards || []).map((std, idx) => {
      const pct = std.percentage || 0;
      const colorCls = pct >= 90 ? 'bg-green' : (pct >= 75 ? 'bg-blue' : (pct >= 50 ? 'bg-yellow' : 'bg-red'));
      const badgeCls = pct >= 90 ? 'badge-green' : (pct >= 75 ? 'badge-blue' : (pct >= 50 ? 'badge-yellow' : 'badge-red'));

      return `
        <div class="review-standard-card" style="margin-bottom: 1.25rem;">
          <div class="review-standard-header" onclick="App.toggleResultsStandardAccordion(${idx})">
            <div>
              <span class="badge badge-gray" style="margin-left: 0.5rem;">${std.code}</span>
              <strong>${std.name}</strong>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 0.5rem;">(الوزن الرسمي: ${std.weight}%)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge ${badgeCls}">${std.performance_level?.label || 'متوسط'} (${pct}%)</span>
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">مساهمة: ${std.weighted_score}%</span>
              <span id="res-std-arrow-${idx}">▼</span>
            </div>
          </div>

          <div id="res-std-body-${idx}" class="review-standard-body" style="padding: 1rem;">
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
                <span>الدرجة الخام المرجحة: <strong>${std.raw_score} من 3.00</strong></span>
                <span>المساهمة الموزونة في نتيجة المدرسة: <strong>${std.weighted_score} من ${std.weight}%</strong></span>
              </div>
              <div class="progress-container">
                <div class="progress-bar-fill ${colorCls}" style="width: ${pct}%;"></div>
              </div>
            </div>

            <!-- المعايير الفرعية والمؤشرات -->
            ${(std.sub_standards || []).map(sub => `
              <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <strong style="color: #334155; font-size: 0.9rem;">${sub.code} — ${sub.name}</strong>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">متوسط الدرجة: ${sub.raw_score} / 3 (${sub.percentage}%)</span>
                </div>
                
                <div class="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 80px;">الكود</th>
                        <th>المؤشر المعياري</th>
                        <th style="width: 70px;">الوزن</th>
                        <th style="width: 80px;">الدرجة</th>
                        <th style="width: 80px;">النسبة</th>
                        <th>المستوى الوصفي</th>
                        <th style="width: 80px;">الشواهد</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(sub.indicators || []).map(ind => `
                        <tr>
                          <td><strong>${ind.code}</strong></td>
                          <td>
                            ${ind.name}
                            ${ind.descriptor ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${ind.descriptor}</div>` : ''}
                          </td>
                          <td>${ind.weight}</td>
                          <td><span class="badge badge-gray" style="font-weight: 700;">${ind.score !== null ? ind.score + ' / 3' : '-'}</span></td>
                          <td><strong>${ind.percentage !== null ? ind.percentage + '%' : '-'}</strong></td>
                          <td>${ind.level_label || '-'}</td>
                          <td>${ind.evidences_count > 0 ? `<span class="badge badge-green">${ind.evidences_count} شواهد</span>` : '<span class="badge badge-gray">0</span>'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `).join('')}

            <div style="text-align: left; margin-top: 0.75rem;">
              <button class="btn btn-sm btn-secondary" onclick="App.openStandardResult('${std.code}')">
                عرض تقرير المعيار بشكل منفصل 📄
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleResultsStandardAccordion(idx) {
    const body = document.getElementById(`res-std-body-${idx}`);
    const arrow = document.getElementById(`res-std-arrow-${idx}`);
    if (!body) return;
    const isHidden = body.classList.contains('hidden');
    if (isHidden) {
      body.classList.remove('hidden');
      if (arrow) arrow.textContent = '▼';
    } else {
      body.classList.add('hidden');
      if (arrow) arrow.textContent = '◀';
    }
  },

  toggleAllResultsStandards(expand) {
    const bodies = document.querySelectorAll('#res-standards-container .review-standard-body');
    bodies.forEach((b, idx) => {
      const arrow = document.getElementById(`res-std-arrow-${idx}`);
      if (expand) {
        b.classList.remove('hidden');
        if (arrow) arrow.textContent = '▼';
      } else {
        b.classList.add('hidden');
        if (arrow) arrow.textContent = '◀';
      }
    });
  },

  // ---------------------------------------------------------------------------
  // الشاشة 12: نتيجة معيار محدد (Standard Result Inspector)
  // ---------------------------------------------------------------------------
  async loadStandardResult(standardId) {
    const schoolId = this.getSchoolId();
    const evalId = this.getEvaluationId();
    const stdId = standardId || this.state.currentStandardId || 1;
    const content = document.getElementById('stdres-content');
    const alertBox = document.getElementById('stdres-alert');

    content.innerHTML = '<div class="card" style="text-align: center;">جارِ جلب نتائج المعيار...</div>';
    alertBox.classList.add('hidden');

    const res = await this.request(`/schools/${schoolId}/assessments/${evalId}/standards/${stdId}/results`);

    if (!res.ok) {
      content.innerHTML = '';
      alertBox.classList.remove('hidden');
      alertBox.innerHTML = `<strong>تنبيه المعيار (القاعدة 8):</strong> ${res.message}<br>${res.errors?.standard?.[0] || ''}`;
      return;
    }

    const std = res.data;
    document.getElementById('stdres-title').textContent = `نتيجة المعيار: ${std.code} — ${std.name}`;
    document.getElementById('stdres-meta').textContent = 
      `الوزن المعتمد: ${std.weight}% | الدرجة الخام: ${std.raw_score} من 3.00 | المساهمة الموزونة: ${std.weighted_score}% | عدد المؤشرات: ${std.total_indicators}`;

    const pct = std.percentage || 0;
    document.getElementById('stdres-pct-text').textContent = `${pct}%`;
    const bar = document.getElementById('stdres-progress-bar');
    bar.style.width = `${pct}%`;
    bar.className = `progress-bar-fill ${pct >= 90 ? 'bg-green' : (pct >= 75 ? 'bg-blue' : (pct >= 50 ? 'bg-yellow' : 'bg-red'))}`;

    const badgeCls = pct >= 90 ? 'badge-green' : (pct >= 75 ? 'badge-blue' : (pct >= 50 ? 'badge-yellow' : 'badge-red'));
    document.getElementById('stdres-score-badge').innerHTML = `
      <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary);">${std.raw_score} <span style="font-size: 0.9rem; color: var(--text-muted);">/ 3</span></div>
      <span class="badge ${badgeCls}">${std.performance_level?.label || 'متوسط'} (${pct}%)</span>
    `;

    // تفاصيل المجالات الفرعية
    content.innerHTML = (std.sub_standards || []).map(sub => `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <span class="badge badge-gray">${sub.code}</span>
            <strong style="margin-right: 0.35rem; font-size: 1rem;">${sub.name}</strong>
          </div>
          <span class="badge badge-blue">النسبة: ${sub.percentage}% (متوسط: ${sub.raw_score}/3)</span>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">الكود</th>
                <th>المؤشر المعياري</th>
                <th style="width: 70px;">الوزن</th>
                <th style="width: 80px;">الدرجة</th>
                <th style="width: 80px;">النسبة</th>
                <th>المستوى الوصفي</th>
                <th style="width: 90px;">الشواهد المرفوعة</th>
              </tr>
            </thead>
            <tbody>
              ${(sub.indicators || []).map(ind => `
                <tr>
                  <td><strong>${ind.code}</strong></td>
                  <td>
                    ${ind.name}
                    ${ind.descriptor ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${ind.descriptor}</div>` : ''}
                  </td>
                  <td>${ind.weight}</td>
                  <td><span class="badge badge-gray" style="font-weight: 700;">${ind.score !== null ? ind.score + ' / 3' : '-'}</span></td>
                  <td><strong>${ind.percentage !== null ? ind.percentage + '%' : '-'}</strong></td>
                  <td>${ind.level_label || '-'}</td>
                  <td>${ind.evidences_count > 0 ? `<span class="badge badge-green">${ind.evidences_count} شواهد</span>` : '<span class="badge badge-gray">0</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  },

  // ---------------------------------------------------------------------------
  // الشاشة 13: ملخص ونسب اكتمال الشواهد (Evidence Summary)
  // ---------------------------------------------------------------------------
  async loadEvidenceSummary() {
    const schoolId = this.getSchoolId();
    const evalId = this.getEvaluationId();
    const container = document.getElementById('evsum-standards-container');

    container.innerHTML = '<div class="card" style="text-align: center;">جارِ جلب ملخص الشواهد...</div>';

    const res = await this.request(`/schools/${schoolId}/assessments/${evalId}/evidence-summary`);

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">${res.message || 'تعذر تحميل ملخص الشواهد.'}</div>`;
      return;
    }

    this.state.evidenceSummaryData = res.data;
    const data = res.data;

    // تعبئة الـ KPIs
    document.getElementById('evsum-kpi-rate').textContent = `${data.overall_evidence_completion_rate}%`;
    document.getElementById('evsum-kpi-rate-sub').textContent = `من إجمالي متطلبات الشواهد المعتمدة`;
    document.getElementById('evsum-kpi-uploaded').textContent = data.total_uploaded_evidences;
    document.getElementById('evsum-kpi-required').textContent = data.total_required_evidences;
    document.getElementById('evsum-kpi-missing').textContent = data.indicators_missing_evidence;

    this.renderEvidenceSummaryList(this.state.evidenceFilterMode || 'all');
  },

  filterEvidenceSummary(mode) {
    this.state.evidenceFilterMode = mode;
    const btnAll = document.getElementById('btn-evfilter-all');
    const btnMissing = document.getElementById('btn-evfilter-missing');

    if (mode === 'missing') {
      btnAll.className = 'btn btn-sm btn-secondary';
      btnMissing.className = 'btn btn-sm btn-primary';
    } else {
      btnAll.className = 'btn btn-sm btn-primary';
      btnMissing.className = 'btn btn-sm btn-secondary';
    }

    this.renderEvidenceSummaryList(mode);
  },

  renderEvidenceSummaryList(mode) {
    const container = document.getElementById('evsum-standards-container');
    const data = this.state.evidenceSummaryData;
    if (!container || !data) return;

    const standards = data.standards || [];

    container.innerHTML = standards.map((std, sIdx) => {
      let indicators = std.indicators || [];
      if (mode === 'missing') {
        indicators = indicators.filter(ind => !ind.is_satisfied || ind.uploaded_count === 0);
      }

      if (indicators.length === 0 && mode === 'missing') {
        return ''; // إخفاء المعيار إذا لم تكن هناك مؤشرات ناقصة
      }

      const rate = std.completion_rate || 0;
      const rateCls = rate >= 100 ? 'badge-green' : (rate >= 50 ? 'badge-yellow' : 'badge-red');

      return `
        <div class="card" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div>
              <span class="badge badge-gray">${std.code}</span>
              <strong style="margin-right: 0.35rem; font-size: 1rem; color: #1e293b;">${std.name}</strong>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 0.5rem;">
                (مرفوع ${std.total_uploaded_evidences} من ${std.total_required_evidences} متطلباً)
              </span>
            </div>
            <span class="badge ${rateCls}">نسبة استيفاء المعيار: ${rate}%</span>
          </div>

          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">الكود</th>
                  <th>المؤشر المعياري</th>
                  <th style="width: 100px;">المطلوب رسمياً</th>
                  <th style="width: 100px;">المرفوع فعلياً</th>
                  <th style="width: 90px;">الناقص</th>
                  <th style="width: 90px;">نسبة الإنجاز</th>
                  <th style="width: 100px;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${indicators.map(ind => {
                  const indRate = ind.completion_rate || 0;
                  const isSatisfied = ind.is_satisfied;
                  return `
                    <tr style="${!isSatisfied ? 'background: #fffdf5;' : ''}">
                      <td><strong>${ind.code}</strong></td>
                      <td>${ind.name}</td>
                      <td><strong>${ind.required_count}</strong> متطلبات</td>
                      <td><span class="badge ${ind.uploaded_count > 0 ? 'badge-blue' : 'badge-gray'}">${ind.uploaded_count} شواهد</span></td>
                      <td>${ind.missing_count > 0 ? `<span class="badge badge-red">ناقص ${ind.missing_count}</span>` : '<span class="badge badge-green">0</span>'}</td>
                      <td><strong>${indRate}%</strong></td>
                      <td>${isSatisfied ? '<span class="badge badge-green">مستوفٍ ✅</span>' : '<span class="badge badge-yellow">بحاجة لاستكمال ⚠️</span>'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    if (mode === 'missing' && container.innerHTML.trim() === '') {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: #166534; background: #f0fdf4;">
          🎉 رائع! تم استيفاء الشواهد المطلوبة لكافة المؤشرات في هذا التقييم.
        </div>
      `;
    }
  },

  // ---------------------------------------------------------------------------
  // الشاشة 14: ملخص خطط وإجراءات التحسين (Plans Summary)
  // ---------------------------------------------------------------------------
  async loadPlansSummary() {
    const schoolId = this.getSchoolId();
    const tbody = document.getElementById('plansum-table-body');
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">جارِ جلب ملخص الخطط...</td></tr>';

    const res = await this.request(`/schools/${schoolId}/improvement-plans/summary`);

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="10" style="color: red; text-align: center;">${res.message || 'تعذر جلب الملخص.'}</td></tr>`;
      return;
    }

    const data = res.data;
    const plansSummary = data.plans_summary || {};
    const actionsSummary = data.actions_summary || {};
    const plansList = data.plans || [];

    // تعبئة بطاقات الـ KPI
    document.getElementById('plansum-kpi-total').textContent = plansSummary.total_plans || 0;
    document.getElementById('plansum-kpi-active').textContent = plansSummary.in_progress_plans || 0;
    document.getElementById('plansum-kpi-completed').textContent = plansSummary.completed_plans || 0;
    document.getElementById('plansum-kpi-delayed').textContent = plansSummary.delayed_plans || 0;

    if (plansList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">لا توجد خطط تحسين مسجلة حالياً لهذه المدرسة.</td></tr>';
      return;
    }

    tbody.innerHTML = plansList.map(p => {
      const isDelayed = p.is_delayed;
      const statusBadge = p.status === 'Completed' ? 'badge-green' : (p.status === 'Active' ? 'badge-blue' : (p.status === 'Draft' ? 'badge-yellow' : 'badge-gray'));
      const rate = p.completion_rate || 0;

      return `
        <tr>
          <td><strong>#${p.plan_id}</strong></td>
          <td><strong>${p.title}</strong></td>
          <td>${p.start_date || '-'} إلى ${p.end_date || '-'}</td>
          <td><span class="badge ${statusBadge}">${p.status}</span></td>
          <td>${isDelayed ? '<span class="badge badge-red">متأخرة ⚠️</span>' : '<span class="badge badge-green">منتظمة</span>'}</td>
          <td>${p.total_actions} إجراءات</td>
          <td><span class="badge badge-green">${p.completed_actions}</span></td>
          <td>${p.delayed_actions > 0 ? `<span class="badge badge-red">${p.delayed_actions}</span>` : '0'}</td>
          <td>
            <div style="font-weight: 700;">${rate}%</div>
            <div class="progress-container" style="height: 5px; margin: 0.2rem 0;">
              <div class="progress-bar-fill bg-green" style="width: ${rate}%;"></div>
            </div>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="App.navTo('plans')">
              عرض بالخطط 📋
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ---------------------------------------------------------------------------
  // الشاشة 15: تصدير تقرير التقييم الكامل (Export Assessment Report)
  // ---------------------------------------------------------------------------
  async loadExportReport() {
    const schoolId = this.getSchoolId();
    const evalId = this.getEvaluationId();
    const alertBox = document.getElementById('export-error-alert');
    const container = document.getElementById('export-content-container');
    const jsonPre = document.getElementById('export-json-code');

    jsonPre.textContent = 'جارِ توليد وتجهيز وثيقة التصدير...';
    alertBox.classList.add('hidden');
    container.classList.add('hidden');

    const res = await this.request(`/schools/${schoolId}/assessments/${evalId}/export`);

    if (!res.ok) {
      alertBox.classList.remove('hidden');
      alertBox.innerHTML = `<strong>تنبيه التصدير (القاعدة 8):</strong> ${res.message}<br>${res.errors?.evaluation?.[0] || ''}`;
      return;
    }

    this.state.exportReportData = res.data;
    const report = res.data;
    container.classList.remove('hidden');

    // الملخص التنفيذي
    const exec = report.executive_summary || {};
    const school = report.school_information || {};
    const evalCtx = report.evaluation_context || {};

    const execContainer = document.getElementById('export-executive-summary');
    execContainer.innerHTML = `
      <div class="kpi-card kpi-primary">
        <div class="kpi-label">النتيجة النهائية للمدرسة</div>
        <div class="kpi-value">${exec.final_score}%</div>
        <div class="kpi-sub">${exec.performance_level?.label || 'متميز'}</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-label">المعايير المعتمدة</div>
        <div class="kpi-value">${exec.total_standards} معايير</div>
        <div class="kpi-sub">أوزان رسمية 100%</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-label">المؤشرات المفحوصة</div>
        <div class="kpi-value">${exec.total_indicators} مؤشر</div>
        <div class="kpi-sub">مكتملة ومقيمة بنسبة 100%</div>
      </div>
      <div class="kpi-card kpi-danger">
        <div class="kpi-label">شواهد وخطط التحسين</div>
        <div class="kpi-value">${exec.strengths_count} قوة | ${exec.improvement_opportunities_count} تحسين</div>
        <div class="kpi-sub">جاهز للإنهاء والتقديم للإشراف الوزاري</div>
      </div>
    `;

    // نقاط القوة
    const strengthsList = document.getElementById('export-strengths-list');
    strengthsList.innerHTML = (exec.top_strengths || []).map(s => `
      <div class="strength-card">
        <strong>[${s.code}]</strong> ${s.name}
        <div style="font-size: 0.75rem; color: #166534;">${s.standard_name} — الدرجة: 3 (مستوفٍ كلياً)</div>
      </div>
    `).join('') || '<div style="color: var(--text-muted);">لا توجد مؤشرات بالدرجة الكاملة.</div>';

    // فرص التحسين
    const oppList = document.getElementById('export-opportunities-list');
    oppList.innerHTML = (exec.priority_improvement_areas || []).map(o => `
      <div class="opportunity-card">
        <strong>[${o.code}]</strong> ${o.name}
        <div style="font-size: 0.75rem; color: #854d0e;">${o.standard_name} — الدرجة: ${o.score} (${o.level_label || 'بحاجة لتحسين'})</div>
      </div>
    `).join('') || '<div style="color: var(--text-muted);">لا توجد مؤشرات بدرجات متدنية.</div>';

    // معاينة JSON المنسق
    jsonPre.textContent = JSON.stringify(report, null, 2);
  },

  downloadExportJson() {
    if (!this.state.exportReportData) {
      this.showAlert('لا توجد بيانات تقرير جاهزة للتنزيل.', 'warning');
      return;
    }

    const jsonStr = JSON.stringify(this.state.exportReportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const schoolId = this.getSchoolId();
    const evalId = this.getEvaluationId();
    link.href = url;
    link.download = `school_evaluation_report_${schoolId}_${evalId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showAlert('تم بدء تنزيل ملف التقرير بصيغة JSON بنجاح.', 'success');
  },

  copyExportJson() {
    if (!this.state.exportReportData) {
      this.showAlert('لا توجد بيانات تقرير لنسخها.', 'warning');
      return;
    }

    const jsonStr = JSON.stringify(this.state.exportReportData, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      this.showAlert('تم نسخ محتوى التقرير (JSON) إلى الحافظة بنجاح.', 'success');
    }).catch(err => {
      console.error(err);
      this.showAlert('تعذر النسخ تلقائياً، يرجى النسخ اليدوي.', 'error');
    });
  },

  showSubmitErrorsModal(res) {
    const modal = document.getElementById('modal-submit-errors');
    if (!modal) return;

    const banner = document.getElementById('submit-error-banner');
    if (banner) banner.textContent = res.message || 'لا يمكن تقديم التقييم لوجود متطلبات ناقصة.';

    const unscoredList = res.errors?.unscored_indicators || [];
    const unscoredSec = document.getElementById('submit-unscored-section');
    const unscoredContainer = document.getElementById('submit-unscored-list');
    const unscoredCount = document.getElementById('submit-unscored-count-badge');

    if (unscoredCount) unscoredCount.textContent = `${unscoredList.length} مؤشر`;
    if (unscoredList.length > 0 && unscoredContainer) {
      unscoredSec.style.display = 'block';
      unscoredContainer.innerHTML = unscoredList.map(ind => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: #fff; border-radius: 4px; border: 1px solid #fed7aa; font-size: 0.82rem;">
          <div>
            <strong style="color: #991b1b;">${ind.code}</strong>: ${ind.name}
          </div>
          <button class="btn btn-sm btn-primary" onclick="App.closeSubmitErrorsModal(); App.navTo('indicators');">
            ✏️ رصد الدرجة
          </button>
        </div>
      `).join('');
    } else if (unscoredSec) {
      unscoredSec.style.display = 'none';
    }

    const missingList = res.errors?.missing_evidence_indicators || [];
    const missingSec = document.getElementById('submit-missing-ev-section');
    const missingContainer = document.getElementById('submit-missing-ev-list');
    const missingCount = document.getElementById('submit-missing-ev-count-badge');

    if (missingCount) missingCount.textContent = `${missingList.length} مؤشر`;
    if (missingList.length > 0 && missingContainer) {
      missingSec.style.display = 'block';
      missingContainer.innerHTML = missingList.map(ind => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: #fff; border-radius: 4px; border: 1px solid #fed7aa; font-size: 0.82rem;">
          <div>
            <strong style="color: #c2410c;">${ind.code}</strong>: ${ind.name}
            <span class="badge badge-gray" style="margin-right: 0.5rem; font-size: 0.75rem;">
              صالح: ${ind.valid_evidence_count ?? ind.uploaded_evidence_count ?? 0} / مطلوب: ${ind.required_requirements_count}
            </span>
          </div>
          <button class="btn btn-sm btn-primary" onclick="App.closeSubmitErrorsModal(); App.openIndicatorEvidencesModal(${ind.indicator_id}, '${ind.code}', '${encodeURIComponent(ind.name)}');">
            📁 إدارة الشواهد
          </button>
        </div>
      `).join('');
    } else if (missingSec) {
      missingSec.style.display = 'none';
    }

    modal.classList.remove('hidden');
  },

  closeSubmitErrorsModal() {
    const modal = document.getElementById('modal-submit-errors');
    if (modal) modal.classList.add('hidden');
  },

  async handleEvaluationSubmit() {
    if (!this.hasPermission('evaluations.submit')) {
      this.showAlert('غير مصرح لك بتقديم هذا التقييم (تتطلب evaluations.submit).', 'error');
      return;
    }

    const evalId = this.state.currentEvaluation?.evaluationId;
    if (!evalId) return;

    if (!confirm('هل أنت متأكد من رغبتك في إنهاء وتقديم التقييم الذاتي؟\n\nتنبيه: بعد الإنهاء سيتم قفل التقييم نهائياً ولن يُسمح بأي تعديلات على الدرجات أو الشواهد (BR-SCH-03).')) {
      return;
    }

    const res = await this.request(`/evaluations/${evalId}/submit`, {
      method: 'POST'
    });

    if (!res.ok) {
      if (res.status === 422 && res.errors && (res.errors.unscored_indicators || res.errors.missing_evidence_indicators)) {
        this.showSubmitErrorsModal(res);
      } else {
        this.showAlert(res.message || 'فشل إنهاء التقييم.', 'error');
      }
      return;
    }

    this.showAlert(res.message || 'تم إنهاء التقييم الذاتي وتقديمه بنجاح.', 'success');
    if (this.state.currentEvaluation) {
      this.state.currentEvaluation.status = 'Completed';
    }
    await this.loadStandardsTree(evalId);
  },

  async handleDevFillEvaluation() {
    if (!this.isDevMode()) {
      this.showAlert('خاصية التعبئة متاحة فقط لبيئة التطوير والاختبار (Dev Only).', 'error');
      return;
    }

    const evalId = this.getEvaluationId();
    if (!evalId) {
      this.showAlert('يرجى تحديد ملف التقييم أولاً.', 'error');
      return;
    }

    if (this.state.currentEvaluation?.status === 'Completed') {
      this.showAlert('التقييم مقفل ومكتمل مسبقاً ولا يمكن تعديله أو تعبئته.', 'warning');
      return;
    }

    if (!confirm('⚠️ تحذير: هذا الزر للاختبار والتطوير فقط، ولا يُستخدم في بيئة الإنتاج.\n\nهل ترغب في البدء في التعبئة الإلزامية التلقائية لكافة المؤشرات الـ 109 بدرجات وشواهد صالحة للانتقال مباشرة لمراحل ما بعد التقييم؟')) {
      return;
    }

    const progressModal = document.getElementById('modal-dev-progress');
    const progressBar = document.getElementById('dev-progress-bar');
    const progressPercent = document.getElementById('dev-progress-percent');
    const progressStatus = document.getElementById('dev-progress-status');

    if (progressModal) {
      progressModal.style.display = 'flex';
      progressModal.classList.remove('hidden');
    }

    try {
      if (progressStatus) progressStatus.textContent = 'جارِ استدعاء شجرة المعايير والمؤشرات...';

      const treeRes = await this.request(`/evaluations/${evalId}/standards-tree`);
      if (!treeRes.ok || !treeRes.data?.standards) {
        throw new Error(treeRes.message || 'تعذر تحميل شجرة المعايير.');
      }

      const allIndicators = [];
      (treeRes.data.standards || []).forEach(std => {
        (std.subStandards || []).forEach(sub => {
          (sub.indicators || []).forEach(ind => {
            allIndicators.push(ind);
          });
        });
      });

      const total = allIndicators.length;
      if (total === 0) {
        throw new Error('لا توجد مؤشرات في ملف التقييم.');
      }

      for (let i = 0; i < total; i++) {
        const ind = allIndicators[i];
        const pct = Math.round(((i + 1) / total) * 100);

        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}% (${i + 1} / ${total})`;
        if (progressStatus) progressStatus.textContent = `جارِ تعبئة المؤشر [${ind.code}]: ${ind.name.substring(0, 35)}...`;

        // 1. رصد الدرجة (Score = 3)
        const toolIds = (ind.verificationTools || []).map(t => t.id || t.toolId || t.tool_id).filter(Boolean);
        const scoreBody = {
          score: 3,
          textualResult: `تم استيفاء متطلبات المؤشر ${ind.code} ضمن بيانات الاختبار التجريبي.`,
          verificationToolIds: toolIds.length > 0 ? toolIds : undefined,
        };

        await this.request(`/evaluations/${evalId}/indicators/${ind.indicatorId}/score`, {
          method: 'PUT',
          body: scoreBody,
        });

        // 2. رفع الشاهد بصيغة FormData
        const dummyContent = `ملف شاهد تجريبي للمؤشر ${ind.code}\nتاريخ الإنشاء: ${new Date().toISOString()}\nالغرض: الاختبار والتطوير الآلي.`;
        const blob = new Blob([dummyContent], { type: 'text/plain' });
        const file = new File([blob], `evidence_${ind.code}.txt`, { type: 'text/plain' });

        const formData = new FormData();
        formData.append('title', `شاهد تجريبي معتمد للمؤشر ${ind.code}`);
        formData.append('evidence_type', 'report');
        formData.append('file', file);

        const evRes = await this.request(`/evaluations/${evalId}/indicators/${ind.indicatorId}/evidences`, {
          method: 'POST',
          body: formData,
          isFormData: true,
        });

        // 3. ضبط حالة الشاهد لتكون Completed
        if (evRes.ok && evRes.data?.evidenceId) {
          await this.request(`/evidences/${evRes.data.evidenceId}/status`, {
            method: 'PATCH',
            body: { status: 'Completed' },
          });
        }
      }

      if (progressModal) {
        progressModal.style.display = 'none';
        progressModal.classList.add('hidden');
      }

      this.showAlert('⚡ تمت التعبئة الإلزامية لـ 109 مؤشرات بنجاح! التقييم جاهز الآن لإنهاء وتقديم التقييم أو استعراض التقارير وخطط التحسين.', 'success');

      if (this.state.currentScreen === 'standards-tree') {
        await this.loadStandardsTree(evalId);
      } else if (this.state.currentScreen === 'evidence-inventory') {
        await this.loadEvidenceInventory(evalId);
      }
    } catch (err) {
      if (progressModal) {
        progressModal.style.display = 'none';
        progressModal.classList.add('hidden');
      }
      this.showAlert(`حدث خطأ أثناء التعبئة التجريبية: ${err.message}`, 'error');
    }
  },

  async handleDevResetEvaluation() {
    if (!this.isDevMode()) {
      this.showAlert('خاصية إفراغ التقييم متاحة فقط لبيئة التطوير والاختبار (Dev Only).', 'error');
      return;
    }

    const evalId = this.getEvaluationId();
    if (!evalId) {
      this.showAlert('يرجى تحديد ملف التقييم أولاً.', 'error');
      return;
    }

    if (this.state.currentEvaluation?.status === 'Completed') {
      this.showAlert('التقييم مقفل ومكتمل مسبقاً ولا يمكن تعديله أو إفراغه.', 'warning');
      return;
    }

    if (!confirm('⚠️ تنبيه: هل أنت متأكد من رغبتك في إفراغ التقييم التجريبي بالكامل؟\n\nسيتم حذف جميع الدرجات والشواهد الوهمية المرتبطة بهذا التقييم وتركه فارغاً للاختبار من جديد.')) {
      return;
    }

    const res = await this.request(`/evaluations/${evalId}/dev-reset`, {
      method: 'POST',
    });

    if (!res.ok) {
      this.showAlert(res.message || 'تعذر إفراغ التقييم التجريبي.', 'error');
      return;
    }

    this.showAlert('🧹 تم إفراغ التقييم التجريبي بنجاح وحذف كافة الدرجات والشواهد الوهمية.', 'success');

    if (this.state.currentScreen === 'standards-tree') {
      await this.loadStandardsTree(evalId);
    } else if (this.state.currentScreen === 'evidence-inventory') {
      await this.loadEvidenceInventory(evalId);
    }
  },

};