import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, CircularProgress, Tooltip, Skeleton, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAuth } from '../../auth/AuthProvider';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { URLS } from '../../constants/urls';
import { getFormattedDateTimePartsByDateTime } from '../../utils/resourceUtils';

/**
 * @file SubmitAccess.tsx
 * @description
 * This component renders a slidable side panel (from the right) that provides
 * a form for users to request access to a specific data asset.
 *
 * Key functionalities include:
 * 1.  **Form Display**: Shows details about the asset (creation/modification
 * time, contact info) and a multi-line `TextField` for the user to
 * enter a justification message.
 * 2.  **Contact Extraction**: On mount, it attempts to parse the `entry`
 * prop's "contacts" aspect to find data owner/steward emails.
 * 3.  **Submission Logic**:
 * - When "Submit" is clicked, it makes an `axios` POST request to the
 * `ACCESS_REQUEST` API endpoint.
 * - It sends the `assetName`, user's `message`, `requesterEmail` (from
 * `useAuth`), and the extracted `contactEmails`.
 * - If no contacts are found, it informs the user and does not send an email.
 * 4.  **State Handling**: Manages loading (`isSubmitting`), `error`, and
 * `success` states for the API request. On success, it calls the
 * `onSubmitSuccess` prop and closes the panel.
 *
 * @param {SubmitAccessProps} props - The props for the component.
 * @param {boolean} props.isOpen - Controls the visibility of the side panel.
 * If true, the panel slides in; if false, it slides out.
 * @param {() => void} props.onClose - A callback function to be invoked when
 * the panel's close ('X') icon or "Cancel" button is clicked.
 * @param {string} props.assetName - The name of the asset for which access
 * is being requested (e.g., "Sales Data").
 * @param {any} [props.entry] - (Optional) The full entry object for the
 * asset. This is used to extract contact information from its aspects.
 * @param {(assetName: string) => void} props.onSubmitSuccess - A callback
 * function triggered after a successful API submission, passing back the
 * `assetName`.
 * @param {any} [props.previewData] - (Optional) Data used to display
 * creation and modification times in the panel.
 *
 * @returns {React.ReactElement} A React element. It renders the slidable
 * panel `Box` or a `CircularProgress` spinner if `previewData` or `entry`
 * is not yet available.
 */

interface SubmitAccessProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  entry?: any; // Add entry data to extract contacts
  onSubmitSuccess: (assetName: string) => void;
  previewData?: any; 
  isLookup?: boolean;
  isCalledFromDataProducts?: boolean;
  dataProductsDescription?: string;
  assetCounts?: number;
  accessGroups?: any[];
}

const SubmitAccess: React.FC<SubmitAccessProps> = ({ isOpen, onClose, assetName, entry, onSubmitSuccess, previewData, isLookup, isCalledFromDataProducts = false,assetCounts = 0 , accessGroups = [] }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localEntry, setLocalEntry] = useState<any>(null);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  const [isRequiredError, setIsRequiredError] = useState(false);
  const [isMessageEmptyError, setIsMessageEmptyError] = useState(false);
  const [accessGroup, setAccessGroup] = useState<string>('');
  const { user } = useAuth();
  const userState = useSelector((state: any) => state.user);

  // Use locally fetched entry if available, otherwise fall back to prop
  const effectiveEntry = localEntry ?? entry;

  const extractContacts = (entryData: any): any[] => {
    if (!entryData || !entryData.aspects) return [];

    const number = entryData.entryType?.split('/')[1];
    if (!number) return [];

    return isLookup ? entryData.aspects[`${number}.global.contacts`]?.data.identities : (entryData.aspects[`${number}.global.contacts`]?.data.fields.identities.listValue.values || []);
  };

  const extractContactEmails = (entryData: any): string[] => {
    const contacts = extractContacts(entryData);

    return (contacts.length > 0) ? contacts.map((contact: any) => {
      const nameValue = isLookup? contact.name : contact.structValue.fields.name.stringValue;
      // Extract email from format like "Name <email@example.com>"
      const emailMatch = isLookup ? nameValue : nameValue.match(/<(.+?)>/); 
      return isLookup ? emailMatch : (emailMatch ? emailMatch[1] : null);
    }).filter((email: string | null) => email !== null) : [];
  };

  // Fetch entry data locally when entry prop doesn't have contacts
  useEffect(() => {
    if (!previewData?.name || !user?.token) return;
    // If the entry prop already has matching contact data, skip fetch
    if (entry?.aspects && entry?.name === previewData.name) {
      setLocalEntry(null);
      setIsLoadingEntry(false);
      return;
    }
    const fetchEntryData = async () => {
      setIsLoadingEntry(true);
      try {
        const response = await axios.get(
          `${URLS.API_URL}${URLS.GET_ENTRY}?entryName=${previewData.name}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setLocalEntry(response.data);
      } catch {
        setLocalEntry(null);
      } finally {
        setIsLoadingEntry(false);
      }
    };
    fetchEntryData();
  }, [previewData?.name, user?.token, entry]);

  useEffect(() => {
    const contacts: string[] = extractContactEmails(effectiveEntry);
    if (contacts.length > 0) {
      setContactEmails(contacts);
    } else {
      setContactEmails([]);
    }
  }, [effectiveEntry]);

  const handleSubmit = async () => {
    if (!user?.email) {
      setError('User email not available. Please log in again.');
      return;
    }

    if (!userState.token) {
      setError('Authentication token not found. Please log in again.');
      console.error('error:', error);
      return;
    }

    let hasValidationError = false;

    // Check Access Group
    if (isCalledFromDataProducts && accessGroup === '') {
      setIsRequiredError(true);
      hasValidationError = true;
    } else {
      setIsRequiredError(false);
    }

    // Check Message
    if (message.trim() === '') {
      setIsMessageEmptyError(true);
      hasValidationError = true;
    } else {
      setIsMessageEmptyError(false);
    }

    // If any validation failed, stop the submission here
    if (hasValidationError) {
      return;
    }

    try {
      console.log('Extracted contact emails:', contactEmails);
      if(contactEmails.length > 0 || isCalledFromDataProducts){
        console.log('Submitting access request with the following details:');
        console.log('Asset Name:', assetName);
        console.log('Message:', message);
        try {
          // 1. Parse the Dataplex IDs from the resource name
          let projectNumber, locationId, dataProductId;
          if (isCalledFromDataProducts && effectiveEntry?.name) {
             // We use a regex to safely grab the IDs regardless of string formatting
             const match = effectiveEntry.name.match(/projects\/([^/]+)\/locations\/([^/]+)/);
             if (match) {
               projectNumber = match[1];
               locationId = match[2];
               dataProductId = effectiveEntry.name.split('/').pop();
             }
          }

          // 2. Find the selected access group object to extract its ID
          const selectedAccessGroup = accessGroups.find(group => group.principal.googleGroup === accessGroup);

          // 3. Send the updated payload
          const response = await axios.post(`${URLS.API_URL}${URLS.ACCESS_REQUEST}`, {
            assetName,
            message,
            requesterEmail: user.email,
            projectId: import.meta.env.VITE_GOOGLE_PROJECT_ID,
            projectAdmin: contactEmails,
            isDataProductRequest: isCalledFromDataProducts,
            accessGroup: {
              accessGroupEmail: accessGroup, 
              displayName: selectedAccessGroup?.displayName || accessGroup,
              accessGroupId: selectedAccessGroup?.id || selectedAccessGroup?.name?.split('/').pop() || ''
            },
            projectNumber,
            locationId,
            dataProductId
          }, {          
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`
          }
        });

        const data = await response.data;
        if (data.success) {
          setSuccess(true);
          console.log(success);
          setMessage('');
          onSubmitSuccess(assetName);
          
          // Close the panel after a short delay
          setTimeout(() => {
            onClose();
            setSuccess(false);
          }, 2000);
        } else {
          throw new Error(data.error || 'Failed to submit access request');
        }
        
      }catch(error){
        console.log(error);
        throw new Error('Failed to submit access request');
      }

      }else{
        setSuccess(true);
        console.log(success);
        setMessage('Contacts/Emails not available for this entry');
        onSubmitSuccess(assetName);
        
        // Close the panel after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting access request:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleCancel = () => {
    setMessage('');
    setError(null);
    setSuccess(false);
    onClose();
  };

const { date: currentDate, time: currentTime } = getFormattedDateTimePartsByDateTime(new Date().toISOString());

return (previewData != null) ?(
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-500px',
        width: '500px',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        boxShadow: '-4px 0px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 1300,
        transition: 'right 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '20px 24px',
          borderBottom: '1px solid #DADCE0',
          width: '31.1875rem' /* 499px */
        }}
      >
        <Typography
          variant="heading2Medium"
          sx={{
            fontFamily: 'Google Sans',
            fontSize: '1.125rem', /* 18px */
            fontWeight: '500',
            color: '#1F1F1F',
            lineHeight: '1.333em',
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          Request Access for "{assetName.charAt(0).toUpperCase() + assetName.slice(1)}"
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            width: '1.5rem', /* 24px */
            height: '1.5rem', /* 24px */
            color: '#202124',
            padding: 0,
            flexShrink: 0,
            '&:hover': {
              backgroundColor: 'transparent'
            }
          }}
        >
          <Close sx={{ fontSize: '1.5rem' }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Request Details Section */}
        <Box sx={{ borderBottom: '1px solid #DADCE0', paddingBottom: '16px' }}>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#1F1F1F',
              marginBottom: '16px'
            }}
          >
            Request details
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',   
              gap: '16px'
            }}
          >
            {/* Current Time Snapshot Block */}
            <Box sx={{ flex: '1 1 auto' }}>
              <Typography
                sx={{
                  fontFamily: '"Google Sans Text", sans-serif',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#575757',
                  marginBottom: '4px'
                }}
              >
                Request Date
              </Typography>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#1F1F1F'
                }}
              >
                {currentDate}
                <br />
                {currentTime}
              </Typography>
            </Box>
          </Box>
          {/* Access Count Block */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',   
              gap: '16px',
              marginTop: '20px'
            }}
          >
            {isCalledFromDataProducts && (<Box sx={{ flex: '1 1 auto' }}>
              <Typography
                sx={{
                  fontFamily: '"Google Sans Text", sans-serif',
                  fontSize: '11px',
                  // Note: Original code had fontWeight 400 here, you may want 500 for consistency
                  fontWeight: '500', 
                  color: '#575757',
                  marginBottom: '4px'
                }}
              >
                Assets
              </Typography>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#1F1F1F'
                }}
              >
                {assetCounts}
              </Typography>
            </Box>
            )}
          </Box>
        </Box>

        {/* Contact Information Section */}
        <Box sx={{ borderBottom: '1px solid #DADCE0', paddingBottom: '16px' }}>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#1F1F1F',
              marginBottom: '16px'
            }}
          >
            Contact information
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px 24px',
              alignItems: 'flex-start'
            }}
          >
            {
              isLoadingEntry ? (
                <>
                  {[1, 2].map((i) => (
                    <Box key={i}>
                      <Skeleton variant="text" width={60} height={16} sx={{ marginBottom: '4px' }} />
                      <Skeleton variant="text" width={120} height={20} />
                    </Box>
                  ))}
                </>
              ) : extractContacts(effectiveEntry).length > 0 ? (
                extractContacts(effectiveEntry).map((contact: any, index: number) => (
                    <Box key={index}>
                      <Typography
                        sx={{
                          fontFamily: '"Google Sans Text", sans-serif',
                          fontSize: '11px',
                          fontWeight: '500',
                          color: '#575757',
                          marginBottom: '4px'
                        }}
                      >
                        {isLookup ? contact.role : contact.structValue.fields.role.stringValue}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"Google Sans Text", sans-serif',
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#1F1F1F'
                        }}
                      >
                        {isLookup ?
                          (contact.name.split('<').length > 1
                          ? contact.name.split('<')[1].slice(0, -1)
                          : contact.name.length > 0
                            ? contact.name
                            : "--")
                          :

                          (contact.structValue.fields.name.stringValue.split('<').length > 1
                          ? contact.structValue.fields.name.stringValue.split('<')[1].slice(0, -1)
                          : contact.structValue.fields.name.stringValue.length > 0
                            ? contact.structValue.fields.name.stringValue
                            : "--")
                        }
                      </Typography>
                    </Box>
                ))
              ) : (
                <Typography
                  sx={{
                    gridColumn: '1 / -1',
                    fontFamily: '"Google Sans Text", sans-serif',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: '#1F1F1F'
                  }}
                >
                  -
                </Typography>
              )
            }
          </Box>
        </Box>

        {/* Access group Section for dataProducts */}
        { isCalledFromDataProducts && (
          <Box>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1F1F1F',
              marginBottom: '12px'
            }}
          >
            What access are you seeking?
          </Typography>
          <Tooltip
            title={accessGroups.length === 0 ? "No access groups are available for this data product" : ""}
            arrow
            placement="top"
          >
            <FormControl fullWidth disabled={accessGroups.length === 0} error={isRequiredError}>
                <InputLabel id="submit-access-select-helper-label">Access Group *</InputLabel>
                <Select
                    sx={{
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                    }}
                    labelId="submit-access-select-helper-label"
                    id="submit-access-select-helper"
                    name="submit-access-group-selector"
                    value={accessGroup || ''}
                    label="Access Group *"
                    onChange={(event) => {
                        setIsRequiredError(false);
                        const selectedGroup = event.target.value;
                        if (setAccessGroup) {
                            setAccessGroup(selectedGroup);
                        }}
                    }
                >
                    {
                        accessGroups.map((val: any, index: number) => (
                            <MenuItem
                                sx={{
                                    fontSize: '0.9rem',
                                    lineHeight: 1.4,
                                }}
                                key={index} value={val?.principal?.googleGroup}>
                                {val?.displayName || val?.id}
                            </MenuItem>
                        ))
                    }
                </Select>
                {isRequiredError && <FormHelperText style={{ color: 'red' }}>Please select an access group for your request it's required.</FormHelperText>}
            </FormControl>
          </Tooltip>
        </Box>
        )}

        {/* Context and Message Section */}
        <Box>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#1F1F1F',
              marginBottom: '12px'
            }}
          >
            What context would you like to provide your data owner?
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: '400',
              color: '#575757',
              lineHeight: '1.5',
              marginBottom: '16px'
            }}
          >
            The following message will be send to the the owner of the asset. 
            {/* The email will include your request justification, 
            and a link to the Google Cloud console where your data producer can address your request. */}
          </Typography>
          <TextField
            multiline
            rows={6}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (e.target.value.trim() !== '') {
                setIsMessageEmptyError(false);
              }
            }}
            placeholder="Enter your message here... *"
            variant="outlined"
            fullWidth
            required
            error={isMessageEmptyError}
            helperText={isMessageEmptyError ? "A justification message is required." : ""}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '14px',
                '& fieldset': {
                  borderColor: isMessageEmptyError ? '#d32f2f' : '#DADCE0',
                  borderRadius: '8px'
                },
                '&:hover fieldset': {
                  borderColor: isMessageEmptyError ? '#d32f2f' : '#B8B8B8'
                },
                '&.Mui-focused fieldset': {
                  borderColor: isMessageEmptyError ? '#d32f2f' : '#022FCD'
                }
              },
              '& .MuiInputBase-input': {
                fontFamily: '"Google Sans Text", sans-serif',
                fontWeight: '400',
                fontSize: '14px',
                color: '#1F1F1F'
              }
            }}
          />
        </Box>
      </Box>

      {/* Footer with Action Buttons */}
      <Box
        sx={{
          padding: '16px 24px 24px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}
      >
        <Button
          onClick={handleCancel}
          sx={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#575757',
            textTransform: 'none',
            borderRadius: '100px',
            padding: '8px 16px',
            '&:hover': {
              backgroundColor: '#F5F5F5'
            }
          }}
        >
          Cancel
        </Button>
        <Tooltip title={extractContacts(effectiveEntry).length > 0 || isCalledFromDataProducts ? "Click here to send an access request" : "No contact information available to request access"} arrow>
        <Button
          onClick={() => {
            if(extractContacts(effectiveEntry).length > 0 || isCalledFromDataProducts) handleSubmit();
          }}
          variant="contained"
          sx={{
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: (extractContacts(effectiveEntry).length > 0 || isCalledFromDataProducts) ? '#022FCD' : '#A0A0A0',
            color: '#FFFFFF',
            textTransform: 'none',
            borderRadius: '100px',
            padding: '8px 16px',
            opacity: (extractContacts(effectiveEntry).length > 0 || isCalledFromDataProducts) ? 1 : 0.6,
            '&:hover': {
              backgroundColor: (extractContacts(effectiveEntry).length > 0 || isCalledFromDataProducts) ? '#0B3DA8' : '#909090'
            },
            cursor: (extractContacts(effectiveEntry).length > 0 || isCalledFromDataProducts) ? 'pointer' : 'not-allowed',
          }}
        >
          Submit
        </Button>
        </Tooltip>
      </Box>
    </Box>
  ) : (<>
    <CircularProgress />
  </>);
};

export default SubmitAccess;
