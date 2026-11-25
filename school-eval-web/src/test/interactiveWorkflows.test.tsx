import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../features/auth/LoginPage';
import { UploadEvidenceModal } from '../features/evaluation/components/evidences/UploadEvidenceModal';
import { SharedDeficiencyFormFields } from '../features/supervision/components/common/SharedDeficiencyFormFields';
import { UniversalNotificationsDrawer } from '../components/notifications/UniversalNotificationsDrawer';

const mockLogin = vi.fn();
const mockClearAuthError = vi.fn();

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    authError: null,
    clearAuthError: mockClearAuthError,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockFetchNotifications = vi.fn();

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [
      {
        notificationId: 101,
        type: 'completion_requested',
        title: 'طلب استكمال جديد',
        message: 'يرجى استيفاء الشاهد للمؤشر IND-01-01',
        isRead: false,
        relatedEntityId: 42,
        createdAt: '2026-11-25T10:00:00Z',
        relativeTime: 'منذ 5 دقائق',
      },
      {
        notificationId: 102,
        type: 'version_activated',
        title: 'إقرار معياري رسمي',
        message: 'تم إقرار الإصدار 2026.1',
        isRead: true,
        relatedEntityId: 1,
        createdAt: '2026-11-24T10:00:00Z',
        relativeTime: 'أمس',
      },
    ],
    unreadCount: 1,
    isLoading: false,
    error: null,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    fetchNotifications: mockFetchNotifications,
  }),
}));

describe('Interactive Portal Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('LoginPage validates empty inputs and submits credentials to AuthContext', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /دخول إلى النظام/ });
    fireEvent.click(submitBtn);
    expect(mockLogin).not.toHaveBeenCalled();

    const usernameInput = screen.getByPlaceholderText(/اسم المستخدم|أدخل اسم المستخدم/i);
    const passwordInput = screen.getByPlaceholderText(/كلمة المرور|••••••••/i);

    fireEvent.change(usernameInput, { target: { value: 'evaluator_balqis' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'evaluator_balqis',
        password: 'password123',
      });
    });
  });

  it('UploadEvidenceModal submits a valid PDF file and title', async () => {
    const onClose = vi.fn();
    const onUpload = vi.fn().mockResolvedValueOnce(undefined);

    const { container } = render(
      <UploadEvidenceModal
        isOpen={true}
        onClose={onClose}
        onUpload={onUpload}
        initialTitle="محضر اجتماع مجلس الآباء"
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const validFile = new File(['%PDF-1.4 mock'], 'meeting-minutes.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const uploadBtn = screen.getByRole('button', { name: /إيداع الشاهد/ });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          file: validFile,
          title: 'محضر اجتماع مجلس الآباء',
        })
      );
    });
  });

  it('SharedDeficiencyFormFields toggles categories, directives, and allowedActions', () => {
    const onChangeCategories = vi.fn();
    const onChangeNote = vi.fn();
    const onChangeDirectives = vi.fn();
    const onChangeAllowedActions = vi.fn();

    render(
      <SharedDeficiencyFormFields
        categories={['شاهد غير كافٍ أو مفقود']}
        onChangeCategories={onChangeCategories}
        note="نقص في التوثيق"
        onChangeNote={onChangeNote}
        directives="يرجى رفع محضر معتمد"
        onChangeDirectives={onChangeDirectives}
        allowedActions={['upload_replace_evidence']}
        onChangeAllowedActions={onChangeAllowedActions}
      />
    );

    fireEvent.click(screen.getByText('مبرر التقدير غير مقنع أو سطحي'));
    expect(onChangeCategories).toHaveBeenCalledWith([
      'شاهد غير كافٍ أو مفقود',
      'مبرر التقدير غير مقنع أو سطحي',
    ]);

    fireEvent.click(screen.getByText('تعديل المبرر التوثيقي للمقيم'));
    expect(onChangeAllowedActions).toHaveBeenCalledWith([
      'upload_replace_evidence',
      'edit_justification',
    ]);
  });

  it('UniversalNotificationsDrawer filters unread notifications and marks all as read', async () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();

    render(
      <UniversalNotificationsDrawer
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText('طلب استكمال جديد')).toBeInTheDocument();
    expect(screen.getByText('إقرار معياري رسمي')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /غير المقروء/ }));
    expect(screen.getByText('طلب استكمال جديد')).toBeInTheDocument();
    expect(screen.queryByText('إقرار معياري رسمي')).not.toBeInTheDocument();

    const markAllBtn = screen.getByRole('button', { name: /قراءة الكل/ });
    fireEvent.click(markAllBtn);
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('طلب استكمال جديد'));
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(101);
      expect(onNavigate).toHaveBeenCalledWith('completion-request', 42);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
