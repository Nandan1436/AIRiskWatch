import { GoogleLogin } from "@react-oauth/google";
import { useTheme } from "../../context/ThemeContext";

interface GoogleSignInButtonProps {
  text: "signin_with" | "signup_with";
  onCredential: (credential: string | undefined) => void;
  onError: () => void;
}

export function GoogleSignInButton({ text, onCredential, onError }: GoogleSignInButtonProps) {
  const { theme } = useTheme();
  return (
    <div className="flex justify-center">
      <GoogleLogin
        text={text}
        theme={theme === "dark" ? "filled_black" : "outline"}
        shape="pill"
        width="336"
        onSuccess={(response) => onCredential(response.credential)}
        onError={onError}
      />
    </div>
  );
}
