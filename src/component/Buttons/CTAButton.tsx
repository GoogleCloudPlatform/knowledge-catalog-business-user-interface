import Button from '@mui/material/Button';

/**
 * @file CTAButton.tsx
 * @summary A reusable, styled Call-to-Action (CTA) button component.
 *
 * @description
 * This component renders a Material-UI `Button` with a predefined "Call-to-Action"
 * style (blue background, white text, rounded corners). It serves as a
 * standardized primary button for the application.
 *
 * @param {object} props - The props for the CTAButton component.
 * @param {boolean} [props.disabled=false] - Optional. If true, the button
 * will be rendered in a disabled state. Defaults to `false`.
 * @param {function} props.handleClick - The function to execute when the
 * button is clicked.
 * @param {string} props.text - The text to be displayed inside the button.
 * @param {React.CSSProperties} [props.css] - Optional. An object of CSS
 * properties to merge with or override the default button styles.
 *
 * @returns {JSX.Element} A React component rendering a styled Material-UI `Button`.
 */

interface CTAButtonProps {
  disabled?: boolean;
  handleClick: any | (() => void); // Function to handle search, can be any function type
  text: string; // text to be displayed on the button
  css?: React.CSSProperties; // Optional CSS properties for the button
}

const CTAButton: React.FC<CTAButtonProps> = ({disabled = false, handleClick, text, css}) => {
  return (<Button disabled={disabled} onClick={handleClick} 
    style={{background:"#022FCD", color:"#ffffff", borderRadius:"20px", padding:"5px 20px", ...css}}>
      {text}
  </Button>);
}
export default CTAButton;