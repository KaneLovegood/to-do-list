import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Your profile | Todo planner",
  description: "Manage your Todo planner profile and account security.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
