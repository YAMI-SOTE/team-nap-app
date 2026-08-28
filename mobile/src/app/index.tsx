import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/home" />;
}

/* FOR authentication to be used later within export
if (!user) {
  return <Redirect href="/login" />;
}

return <Redirect href="/home" />;
*/
