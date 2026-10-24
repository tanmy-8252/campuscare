import type { Role } from "./domain";

export type Organisation = { id: string; name: string; kind: string; location: string };
export type Account = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "pending" | "rejected";
  organisation: Organisation;
};
export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  resident: "Student / Staff",
  worker: "Worker",
};
