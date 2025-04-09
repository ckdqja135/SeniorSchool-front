export interface UserProps {
  id: string;
  username: string;
  email: string;
}

export interface SignInProps {
  username: string;
  password: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  handleSignIn?: () => void;
  error?: string;
}
