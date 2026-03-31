import ProfileClient from "./ProfileClient";

export function generateStaticParams() {
  return [{ profileId: "_" }];
}

export default function UserProfilePage() {
  return <ProfileClient />;
}
