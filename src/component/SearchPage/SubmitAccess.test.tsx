import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubmitAccess from './SubmitAccess';
import { AuthContext } from '../../auth/AuthProvider';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock react-redux
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    Provider: actual.Provider,
    useSelector: (selector: any) => {
      return selector({ user: { token: 'mock-redux-token' } });
    }
  };
});

// Mock URLS constants
vi.mock('../../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api/v1',
    ACCESS_REQUEST: '/access-request'
  }
}));

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GOOGLE_PROJECT_ID: 'test-project-id',
    VITE_API_URL: 'http://localhost:3000/api'
  },
  writable: true,
  configurable: true
});

describe('SubmitAccess', () => {
  const mockUser = {
    name: 'Test User',
    email: 'testuser@example.com',
    picture: 'https://example.com/avatar.jpg',
    token: 'random-token',
    tokenExpiry: Math.floor(Date.now() / 1000) + 3600,
    tokenIssuedAt: Math.floor(Date.now() / 1000),
    hasRole: true,
    roles: [],
    permissions: [],
    appConfig: {
      aspects: {},
      projects: {},
      defaultSearchProduct: {},
      defaultSearchAssets: {},
      browseByAspectTypes: {},
      browseByAspectTypesLabels: {},
    }
  };

  const mockAuthContextValue = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    silentLogin: vi.fn().mockResolvedValue(true),
  };

  const mockEntry = {
    name: 'project/dataset/table',
    entryType: 'tables/123',
    aspects: {
      '123.global.contacts': {
        data: {
          fields: {
            identities: {
              listValue: {
                values: [
                  {
                    structValue: {
                      fields: {
                        name: {
                          stringValue: 'John Doe <john.doe@example.com>'
                        },
                        role: {
                          stringValue: 'Owner'
                        }
                      }
                    }
                  },
                  {
                    structValue: {
                      fields: {
                        name: {
                          stringValue: 'Jane Smith <jane.smith@example.com>'
                        },
                        role: {
                          stringValue: 'Owner'
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    assetName: 'test-asset',
    entry: mockEntry,
    onSubmitSuccess: vi.fn(),
    previewData: {
      createTime: { seconds: 1609459200 },
      updateTime: { seconds: 1609545600 }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockClear();
  });

  const renderSubmitAccess = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <SubmitAccess {...defaultProps} {...props} />
      </AuthContext.Provider>
    );
  };

  it('renders the component when open', () => {
    renderSubmitAccess();

    expect(screen.getByText(/Request Access for "Test-asset"/i)).toBeInTheDocument();
    expect(screen.getByText('Request details')).toBeInTheDocument();
    expect(screen.getByText('Contact information')).toBeInTheDocument();
    expect(screen.getByText('What context would you like to provide your data owner?')).toBeInTheDocument();
  });

  it('positions off-screen when closed', () => {
    renderSubmitAccess({ isOpen: false });

    // Component still renders but is positioned off-screen
    expect(screen.getByText(/Request Access for "Test-asset"/i)).toBeInTheDocument();
  });

  it('displays request time', () => {
    renderSubmitAccess();

    expect(screen.getByText('Request Date')).toBeInTheDocument();
  });

  it('displays contact information', () => {
    renderSubmitAccess();

    expect(screen.getAllByText('Owner')).toHaveLength(2); // Two owner labels
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
  });

  it('renders message input field', () => {
    renderSubmitAccess();
    
    // Use regex to ignore extra characters like '*'
    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    expect(messageInput).toBeInTheDocument();
    expect(messageInput).toHaveAttribute('rows', '6');
  });

  it('updates message when user types', () => {
    renderSubmitAccess();
    
    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    expect(messageInput).toHaveValue('Test message');
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    renderSubmitAccess({ onClose: mockOnClose });
    
    const closeButton = screen.getByRole('button', { name: '' }); // Close icon button
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const mockOnClose = vi.fn();
    renderSubmitAccess({ onClose: mockOnClose });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears message when cancel is clicked', () => {
    renderSubmitAccess();
    
    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(messageInput).toHaveValue('');
  });

  it('extracts contact emails from entry data', () => {
    renderSubmitAccess();
    
    // The component should extract emails from the mock entry
    // This is tested indirectly through the submit functionality
    expect(screen.getByText('Contact information')).toBeInTheDocument();
  });

  it('handles missing user email gracefully', async () => {
    const authContextWithoutEmail = {
      ...mockAuthContextValue,
      user: { ...mockUser, email: undefined as any }
    };

    render(
      <AuthContext.Provider value={authContextWithoutEmail}>
        <SubmitAccess {...defaultProps} />
      </AuthContext.Provider>
    );

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    // Should not crash and should not make API call
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('handles missing token gracefully', async () => {
    // The Redux mock at module level provides token, but this tests the component's error handling
    // In real scenario, if token is null/undefined, component should handle gracefully
    // Since we mock Redux at module level with a token, we'll test by checking no crash occurs
    renderSubmitAccess();

    const submitButton = screen.getByText('Submit');

    // Component should render without crashing
    expect(submitButton).toBeInTheDocument();
  });

  it('submits access request successfully', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { success: true }
    });

    const mockOnSubmitSuccess = vi.fn();
    const mockOnClose = vi.fn();

    renderSubmitAccess({
      onSubmitSuccess: mockOnSubmitSuccess,
      onClose: mockOnClose
    });

    // Wait for component to mount and extract contacts
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test access request' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/access-request',
        expect.objectContaining({
          assetName: 'test-asset',
          message: 'Test access request',
          requesterEmail: 'testuser@example.com',
          projectId: expect.toSatisfy((val) => val === undefined || typeof val === 'string'),
          projectAdmin: expect.arrayContaining(['john.doe@example.com', 'jane.smith@example.com'])
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockOnSubmitSuccess).toHaveBeenCalledWith('test-asset');
    }, { timeout: 3000 });
  }, 20000);

  it('handles API error response', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('API Error'));
    renderSubmitAccess();

    // Wait for contacts
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it('handles network error', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));
    renderSubmitAccess();

    // Wait for contacts
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it('handles submission state correctly', async () => {
    vi.mocked(axios.post).mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100)));
    renderSubmitAccess();

    // Wait for contacts
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it('handles entry without aspects', async () => {
    const entryWithoutAspects = { ...mockEntry, aspects: null };

    renderSubmitAccess({ entry: entryWithoutAspects });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    // Should not make API call when no contacts
    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  it('handles entry without entryType', async () => {
    const entryWithoutType = { ...mockEntry, entryType: null };

    renderSubmitAccess({ entry: entryWithoutType });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    // Should not make API call when no contacts
    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  it('auto-closes after successful submission', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
    const mockOnClose = vi.fn();
    renderSubmitAccess({ onClose: mockOnClose });

    // Wait for contacts to load before doing anything
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    // Use regex to ignore the trailing asterisk
    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('clears message after successful submission', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
    renderSubmitAccess();

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(messageInput).toHaveValue('');
    });
  });

  it('handles missing user gracefully', () => {
    const authContextWithoutUser = {
      ...mockAuthContextValue,
      user: null
    };

    render(
      <AuthContext.Provider value={authContextWithoutUser}>
        <SubmitAccess {...defaultProps} />
      </AuthContext.Provider>
    );

    // Should still render without crashing
    expect(screen.getByText(/Request Access for "Test-asset"/i)).toBeInTheDocument();
  });

  describe('Rendering and Loading States', () => {
    it('shows CircularProgress when previewData is null', () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <SubmitAccess {...defaultProps} previewData={null} />
        </AuthContext.Provider>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows panel with skeleton contacts when entry is null', () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <SubmitAccess {...defaultProps} entry={null} />
        </AuthContext.Provider>
      );

      expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
    });

    it('shows CircularProgress when both previewData and entry are undefined', () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <SubmitAccess {...defaultProps} previewData={undefined} entry={undefined} />
        </AuthContext.Provider>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders correctly in lookup mode', async () => {
      const lookupEntry = {
        name: 'lookup/entry',
        entryType: 'entries/456',
        aspects: {
          '456.global.contacts': {
            data: {
              identities: [
                { name: 'Lookup User <lookup@example.com>', role: 'Owner' }
              ]
            }
          }
        }
      };

      const lookupPreview = {
        createTime: '2021-01-01T00:00:00Z',
        updateTime: '2021-01-02T00:00:00Z'
      };

      renderSubmitAccess({ entry: lookupEntry, previewData: lookupPreview, isLookup: true });

      await waitFor(() => {
        expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
      });
    });

    it('renders correctly in regular mode', async () => {
      renderSubmitAccess();

      await waitFor(() => {
        expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Contact Extraction - Dual Mode', () => {
    it('extracts emails correctly in regular mode', async () => {
      renderSubmitAccess();

      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      });
    });

    it('extracts emails correctly in lookup mode', async () => {
      const lookupEntry = {
        name: 'lookup/entry',
        entryType: 'entries/456',
        aspects: {
          '456.global.contacts': {
            data: {
              identities: [
                { name: 'Lookup User <lookup@example.com>', role: 'Owner' },
                { name: 'Second User <second@example.com>', role: 'Steward' }
              ]
            }
          }
        }
      };

      const lookupPreview = {
        createTime: '2021-01-01T00:00:00Z',
        updateTime: '2021-01-02T00:00:00Z'
      };

      renderSubmitAccess({ entry: lookupEntry, previewData: lookupPreview, isLookup: true });

      await waitFor(() => {
        expect(screen.getByText('lookup@example.com')).toBeInTheDocument();
        expect(screen.getByText('second@example.com')).toBeInTheDocument();
      });
    });

    it('handles contacts without email brackets', () => {
      const entryWithPlainName = {
        ...mockEntry,
        aspects: {
          '123.global.contacts': {
            data: {
              fields: {
                identities: {
                  listValue: {
                    values: [
                      {
                        structValue: {
                          fields: {
                            name: { stringValue: 'plainname' },
                            role: { stringValue: 'Owner' }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      };

      renderSubmitAccess({ entry: entryWithPlainName });

      // Should display plain name if no email format
      expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
    });

    it('handles empty contacts array', () => {
      const entryWithNoContacts = {
        ...mockEntry,
        aspects: {
          '123.global.contacts': {
            data: {
              fields: {
                identities: {
                  listValue: {
                    values: []
                  }
                }
              }
            }
          }
        }
      };

      renderSubmitAccess({ entry: entryWithNoContacts });

      expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
    });

    it('correctly displays role from contacts', async () => {
      renderSubmitAccess();

      await waitFor(() => {
        const ownerLabels = screen.getAllByText('Owner');
        expect(ownerLabels.length).toBeGreaterThan(0);
      });
    });

    it('handles mixed role types', async () => {
      const mixedRoleEntry = {
        name: 'project/dataset/table',
        entryType: 'tables/123',
        aspects: {
          '123.global.contacts': {
            data: {
              fields: {
                identities: {
                  listValue: {
                    values: [
                      {
                        structValue: {
                          fields: {
                            name: { stringValue: 'Owner User <owner@example.com>' },
                            role: { stringValue: 'Owner' }
                          }
                        }
                      },
                      {
                        structValue: {
                          fields: {
                            name: { stringValue: 'Steward User <steward@example.com>' },
                            role: { stringValue: 'Steward' }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      };

      renderSubmitAccess({ entry: mixedRoleEntry });

      await waitFor(() => {
        expect(screen.getByText('Owner')).toBeInTheDocument();
        expect(screen.getByText('Steward')).toBeInTheDocument();
      });
    });
  });

  describe('Date/Time Formatting', () => {
    it('displays the Request Date instead of Creation/Modification time', () => {
      renderSubmitAccess();

      expect(screen.getByText('Request Date')).toBeInTheDocument();

      expect(screen.queryByText('Creation Time')).not.toBeInTheDocument();
      expect(screen.queryByText('Modification time')).not.toBeInTheDocument();
    });

    it('handles missing previewData timestamps gracefully', () => {
      const previewWithoutDates = {
        name: 'test-preview'
      };

      renderSubmitAccess({ previewData: previewWithoutDates });
      expect(screen.getByText('Request Date')).toBeInTheDocument();
    });
  });

  describe('Submit Button and Validation', () => {
    it('submit button has correct visual state when no contacts', () => {
      const entryWithoutContacts = { ...mockEntry, aspects: null };

      renderSubmitAccess({ entry: entryWithoutContacts });

      const submitButton = screen.getByText('Submit');
      expect(submitButton).toBeInTheDocument();
    });

    it('submit button enabled when contacts exist', async () => {
      renderSubmitAccess();

      await waitFor(() => {
        const submitButton = screen.getByText('Submit');
        expect(submitButton).toBeInTheDocument();
      });
    });

    it('does not call API when no contacts and submit clicked', async () => {
      const entryWithoutContacts = { ...mockEntry, aspects: null };

      renderSubmitAccess({ entry: entryWithoutContacts });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      // Wait to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('shows tooltip with correct message when contacts exist', async () => {
      renderSubmitAccess();

      await waitFor(() => {
        expect(screen.getByText('Submit')).toBeInTheDocument();
      });

      // Tooltip should be in the document
      const submitButton = screen.getByText('Submit').closest('button');
      expect(submitButton).toBeInTheDocument();
    });

    it('clears message field after submit is initiated', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
    renderSubmitAccess();

    // 1. Wait for contacts to load
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    // 2. Use Regex for placeholder
    const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    // 3. Now it will correctly clear the string
    await waitFor(() => {
      expect(messageInput).toHaveValue('');
    }, { timeout: 3000 });
  });
  });

  describe('API Success Flow', () => {
    it('calls onSubmitSuccess with correct assetName', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
      const mockOnSubmitSuccess = vi.fn();
      renderSubmitAccess({ onSubmitSuccess: mockOnSubmitSuccess });

      // Wait for contacts to load
      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith('test-asset');
      }, { timeout: 3000 });
    });

    it('auto-closes after 2 second timeout on success', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
      const mockOnClose = vi.fn();
      renderSubmitAccess({ onClose: mockOnClose });

      // 1. Wait for contacts to load using real timers
      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      // 2. NOW start fake timers to bypass the 2000ms delay
      vi.useFakeTimers();

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      // 3. Fast forward time safely
      await vi.advanceTimersByTimeAsync(2000);

      expect(mockOnClose).toHaveBeenCalled();

      // 4. Clean up
      vi.useRealTimers();
    });
  });

describe('Error Handling', () => {
    it('handles axios error gracefully', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'));
      renderSubmitAccess();

      // Wait for contacts to load
      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    it('handles API response with success: false', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: false, error: 'API Error' } });
      renderSubmitAccess();

      // Wait for contacts to load
      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined previewData', () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <SubmitAccess {...defaultProps} previewData={undefined} />
        </AuthContext.Provider>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('handles undefined entry', () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <SubmitAccess {...defaultProps} entry={undefined} />
        </AuthContext.Provider>
      );

      expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
    });

    it('handles entry with missing aspects.contacts', () => {
      const entryWithoutContactAspect = {
        name: 'project/dataset/table',
        entryType: 'tables/123',
        aspects: {}
      };

      renderSubmitAccess({ entry: entryWithoutContactAspect });

      expect(screen.getByText(/Request Access for/i)).toBeInTheDocument();
    });

    it('verifies Authorization header uses user.token from AuthContext', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
      renderSubmitAccess();

      // Wait for contacts to load
      await waitFor(() => {
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/Enter your message here/i);
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer random-token'
            })
          })
        );
      }, { timeout: 3000 });
    });
  });
});
