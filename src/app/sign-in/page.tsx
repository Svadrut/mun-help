import { SignIn } from "@clerk/nextjs";
import {shadcn} from "@clerk/themes"

export default function Page() {
  return (
    <div className="flex justify-center py-24">
      <SignIn routing="hash" signUpForceRedirectUrl="/onboard" forceRedirectUrl="/onboard" />
    </div>
  );
}