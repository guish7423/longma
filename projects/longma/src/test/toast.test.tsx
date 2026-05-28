import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../design-system/Toast';

// Helper component to trigger toasts
function ToastTrigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.showToast('Success toast', 'success')}>Show Success</button>
      <button onClick={() => toast.showToast('Error toast', 'error')}>Show Error</button>
      <button onClick={() => toast.showToast('Info toast', 'info')}>Show Info</button>
      <button onClick={() => toast.showToast('Warning toast', 'warning')}>Show Warning</button>
    </div>
  );
}

describe('Toast system', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders children inside provider', () => {
    render(
      <ToastProvider>
        <span>App Content</span>
      </ToastProvider>
    );
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('shows success toast on trigger', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText('Show Success').click();
    });
    expect(screen.getByText('Success toast')).toBeInTheDocument();
  });

  it('shows error toast on trigger', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText('Show Error').click();
    });
    expect(screen.getByText('Error toast')).toBeInTheDocument();
  });

  it('can show multiple toasts simultaneously', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText('Show Success').click();
      screen.getByText('Show Info').click();
    });
    expect(screen.getByText('Success toast')).toBeInTheDocument();
    expect(screen.getByText('Info toast')).toBeInTheDocument();
  });
});
