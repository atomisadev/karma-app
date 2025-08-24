import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
      <div className="flex w-full justify-center items-center h-screen text-center">
        <SignIn redirectUrl="/" afterSignInUrl="/" />
      </div>
    );
}
