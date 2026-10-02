import { Redirect } from "expo-router";

/** Landing spot for agape://auth-callback after Google sign-in; the auth provider has already taken the session. */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
