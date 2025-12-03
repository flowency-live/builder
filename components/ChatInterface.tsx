'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/models/types';

export interface ChatInterfaceProps {
  sessionId: string;
  onMessageSent: (message: string) => void;
  messages: Message[];
  isStreaming: boolean;
  onOpenSpec?: () => void;
  onRequestSummary?: () => void;
}

export default function ChatInterface({
  sessionId,
  onMessageSent,
  messages,
  isStreaming,
  onOpenSpec,
  onRequestSummary,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input after AI response completes (without scrolling)
  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      onMessageSent(inputValue.trim());
      setInputValue('');
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMagicLink = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/magic-link`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const link = data.sessionUrl; // Use the simple collaboration link

        // Copy to clipboard
        await navigator.clipboard.writeText(link);

        // Show success message
        alert(`Link copied to clipboard!\n\nShare this link to collaborate:\n${link}\n\nAnyone with this link can view and continue this specification.`);
      } else {
        alert('Failed to generate share link. Please try again.');
      }
    } catch (error) {
      console.error('Error generating magic link:', error);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleContactUs = () => {
    // TODO: Implement contact modal in future task
    alert('Contact form will be implemented in a future task');
  };

  // Parse quick response options from message content
  const parseQuickOptions = (content: string): { text: string; options: string[] } | null => {
    const match = content.match(/Quick options:\s*(.+)$/im);
    if (!match) return null;

    const optionsText = match[1];
    const options = optionsText
      .split('|')
      .map(opt => opt.trim().replace(/^\[|\]$/g, ''))
      .filter(opt => opt.length > 0);

    const text = content.replace(/Quick options:\s*.+$/im, '').trim();
    return { text, options };
  };

  // Parse action buttons from message content
  const parseActionButtons = (content: string): { text: string; buttons: string[] } | null => {
    const buttonRegex = /\[BUTTON:([^\]]+)\]/g;
    const buttons: string[] = [];
    let match;

    while ((match = buttonRegex.exec(content)) !== null) {
      buttons.push(match[1]);
    }

    if (buttons.length === 0) return null;

    // Remove button markers from text
    const text = content.replace(/\[BUTTON:[^\]]+\]/g, '').trim();
    return { text, buttons };
  };

  // Handle quick option button click
  const handleQuickOption = (option: string) => {
    if (!isStreaming) {
      onMessageSent(option);
    }
  };

  // Handle action button click
  const handleActionButton = (button: string) => {
    switch (button) {
      case 'View Spec':
        onOpenSpec?.();
        break;
      case 'Continue Refining':
        // Just focus the input - user continues chatting
        inputRef.current?.focus();
        break;
      default:
        console.warn(`Unknown action button: ${button}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)] pt-16">
      {/* Action Buttons Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center justify-end">
        <div className="flex items-center space-x-2">
          {onOpenSpec && (
            <button
              onClick={onOpenSpec}
              className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors rounded-[var(--radius-md)] hover:bg-[var(--color-surface-elevated)] flex items-center gap-2"
              title="View specification"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="hidden sm:inline">View Spec</span>
            </button>
          )}
          {onRequestSummary && (
            <button
              onClick={onRequestSummary}
              className="px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors rounded-[var(--radius-md)] hover:bg-[var(--color-surface-elevated)] flex items-center gap-2"
              title="Get progress summary and next steps"
              disabled={isStreaming}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <span className="hidden sm:inline">Progress</span>
            </button>
          )}
          <button
            onClick={handleMagicLink}
            className="px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors rounded-[var(--radius-md)] hover:bg-[var(--color-surface-elevated)]"
            title="Continue on another device"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <button
            onClick={handleContactUs}
            className="px-3 py-1.5 text-sm bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] hover:bg-[var(--color-primary)] transition-colors rounded-[var(--radius-md)]"
          >
            Need Help?
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--color-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                Let's build your specification
              </h2>
              <p className="text-[var(--color-muted-foreground)]">
                Tell me about your software project idea, and I'll guide you through
                creating a comprehensive specification.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const quickOptions = message.role === 'assistant' ? parseQuickOptions(message.content) : null;
              const actionButtons = message.role === 'assistant' ? parseActionButtons(message.content) : null;

              // Apply parsers in order: action buttons first, then quick options
              let displayContent = message.content;
              if (actionButtons) {
                displayContent = actionButtons.text;
              } else if (quickOptions) {
                displayContent = quickOptions.text;
              }

              return (
                <div key={message.id}>
                  <div
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-[var(--color-primary)] text-white'
                          : message.role === 'system'
                          ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20'
                          : 'bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {displayContent}
                      </div>
                      {message.metadata?.specUpdated && (
                        <div className="mt-2 pt-2 border-t border-current/20 text-xs opacity-75">
                          ✓ Specification updated
                        </div>
                      )}
                      <div className="mt-1 text-xs opacity-60">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {actionButtons && actionButtons.buttons.length > 0 && (
                    <div className="flex justify-start mt-3 ml-2">
                      <div className="flex flex-wrap gap-3 max-w-[80%]">
                        {actionButtons.buttons.map((button, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleActionButton(button)}
                            className="px-5 py-2.5 text-sm font-medium bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            {button === 'View Spec' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            {button === 'Continue Refining' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            )}
                            {button}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Response Buttons */}
                  {quickOptions && quickOptions.options.length > 0 && (
                    <div className="flex justify-start mt-2 ml-2">
                      <div className="flex flex-wrap gap-2 max-w-[80%]">
                        {quickOptions.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickOption(option)}
                            disabled={isStreaming}
                            className="px-4 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your project idea..."
                disabled={isStreaming}
                rows={1}
                className="w-full px-4 py-3 bg-[var(--color-input)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  minHeight: '48px',
                  maxHeight: '200px',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isStreaming}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Send</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)] text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
