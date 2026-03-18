import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#050505]">
      <SignUp appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case' } }} />
    </div>
  );
}