import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Tooltip, Drawer } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAuth } from '../../auth/AuthProvider';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { URLS } from '../../constants/urls';

/**
 * @file Feedback.tsx
 */

interface SendFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (assetName: string) => void;
}

const SendFeedback: React.FC<SendFeedbackProps> = ({ isOpen, onClose, onSubmitSuccess }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contactEmails:string[] = [
    import.meta.env.VITE_SUPPORT_EMAIL || import.meta.env.VITE_ADMIN_EMAIL, 
    "dataplex-interface-feedback@google.com"
  ];
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const userState = useSelector((state: any) => state.user);

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

    setIsSubmitting(true);
    console.log(isSubmitting);
    setError(null);
    setSuccess(false);

    try {
      if(contactEmails.length > 0){
        try{
        const response = await axios.post(`${URLS.API_URL}${URLS.SEND_FEEDBACK}`, {
            message,
            requesterEmail: user.email,
            projectId: import.meta.env.VITE_GOOGLE_PROJECT_ID,
            projectAdmin: contactEmails 
          },{
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
          onSubmitSuccess("Your request has been sent successfully");
          
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
        setMessage('There is no support email available. Please contact your administrator.');
        onSubmitSuccess("There is no support email available. Please contact your administrator.");
        
        // Close the panel after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setError(null);
    setSuccess(false);
    onClose();
  };


return (
  <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '500px',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0px 8px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
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
          gap: '8.75rem', /* 140px */
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
            textAlign: 'left'
          }}
        >
          Send Feedback
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            width: '1.5rem', /* 24px */
            height: '1.5rem', /* 24px */
            color: '#202124',
            padding: 0,
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
          // border: '1px solid red'
        }}
      >

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
            Describe your feedback (required)
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
            The following message will be send to the admin/support. 
            {/* The email will include your request justification, 
            and a link to the Google Cloud console where your data producer can address your request. */}
          </Typography>
          {/* <Typography
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#1F1F1F',
              marginBottom: '12px'
            }}
          >
            Add your message here
          </Typography> */}
          <TextField
            multiline
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message here..."
            variant="outlined"
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '14px',
                '& fieldset': {
                  borderColor: '#DADCE0',
                  borderRadius: '8px'
                },
                '&:hover fieldset': {
                  borderColor: '#B8B8B8'
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#022FCD'
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
        <Tooltip title={contactEmails.length > 0 ? "Click here to send an feedback" : "No information available to send feedback"} arrow>
        <Button
          //disabled = {contactEmails.length > 0 ? false : true}
          onClick={() => {
            if(contactEmails.length > 0 && message.length > 0) handleSubmit();
          }}
          variant="contained"
          style={{color: '#FFFFFF',backgroundColor: '#022FCD'}}
          sx={{
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: contactEmails.length > 0 ? '#022FCD' : '#A0A0A0',
            color: '#FFFFFF',
            textTransform: 'none',
            borderRadius: '100px',
            padding: '8px 16px',
            opacity:  1,
            '&:hover': {
              backgroundColor: contactEmails.length > 0 ? '#0B3DA8' : '#A0A0A0'
            }
          }}
        >
          Send
        </Button>
        </Tooltip>
      </Box>
    </Box>
    </Drawer>
  );
};

export default SendFeedback;
