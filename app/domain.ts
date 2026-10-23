export const categories = [
  "Electrical",
  "Plumbing",
  "Sanitation",
  "Infrastructure",
  "Other",
] as const;
export const zones = [
  "Academic Block",
  "Hostel Zone",
  "Library",
  "Sports Complex",
  "Main Gate",
  "Cafeteria",
] as const;
export const statuses = [
  "Reported",
  "Assigned",
  "In progress",
  "Resolved",
  "Confirmed",
] as const;
export type Category = (typeof categories)[number];
export type Status = (typeof statuses)[number];
export type Role = "admin" | "resident" | "worker";
export type Worker = {
  id: string;
  name: string;
  specialty: Category;
  phone: string;
};
export type Activity = { text: string; at: string };
export type Issue = {
  id: string;
  title: string;
  category: Category;
  zone: string;
  location: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: Status;
  reporter: string;
  workerId: string | null;
  photo: string | null;
  completionPhoto: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  supporters: string[];
  history: Activity[];
};
export type Workspace = { issues: Issue[]; workers: Worker[] };
export const closed = (issue: Issue) =>
  ["Resolved", "Confirmed"].includes(issue.status);
export function seedWorkspace(): Workspace {
  const workers: Worker[] = [
    { id: "w1", name: "Rajesh Kumar", specialty: "Electrical", phone: "" },
    { id: "w2", name: "Priya Singh", specialty: "Sanitation", phone: "" },
    { id: "w3", name: "Mohammed Ali", specialty: "Plumbing", phone: "" },
    { id: "w4", name: "Suresh Yadav", specialty: "Infrastructure", phone: "" },
  ];
  const rows: [
    string,
    Category,
    string,
    string,
    Status,
    Issue["priority"],
    string | null,
  ][] = [
    [
      "Flickering lights in the study hall",
      "Electrical",
      "Library",
      "Second floor · Study hall",
      "Reported",
      "High",
      null,
    ],
    [
      "Leaking tap near the washrooms",
      "Plumbing",
      "Academic Block",
      "Block B · Ground floor",
      "Assigned",
      "Medium",
      "w3",
    ],
    [
      "Overflowing waste bins",
      "Sanitation",
      "Hostel Zone",
      "Hostel C · East entrance",
      "In progress",
      "High",
      "w2",
    ],
    [
      "Broken bench by the basketball court",
      "Infrastructure",
      "Sports Complex",
      "Court 2 · Walking path",
      "Reported",
      "Low",
      null,
    ],
    [
      "Street light is not working",
      "Electrical",
      "Main Gate",
      "Gate 1 · Security cabin",
      "Assigned",
      "High",
      "w1",
    ],
    [
      "Water cooler needs cleaning",
      "Sanitation",
      "Cafeteria",
      "Dining area · Water station",
      "Resolved",
      "Medium",
      "w2",
    ],
    [
      "Loose tiles at the main entrance",
      "Infrastructure",
      "Academic Block",
      "Block A · Main entrance",
      "In progress",
      "High",
      "w4",
    ],
    [
      "Washroom drain is blocked",
      "Plumbing",
      "Hostel Zone",
      "Hostel A · First floor",
      "Confirmed",
      "Medium",
      "w3",
    ],
    [
      "Power socket is damaged",
      "Electrical",
      "Academic Block",
      "Block C · Room 204",
      "Reported",
      "High",
      null,
    ],
    [
      "Broken water fountain",
      "Plumbing",
      "Sports Complex",
      "Athletics track · North end",
      "Resolved",
      "Low",
      "w3",
    ],
    [
      "Waste collection needed",
      "Sanitation",
      "Library",
      "Rear entrance · Reading garden",
      "Confirmed",
      "Low",
      "w2",
    ],
    [
      "Door handle needs repair",
      "Infrastructure",
      "Hostel Zone",
      "Hostel B · Common room",
      "Reported",
      "Medium",
      null,
    ],
    [
      "Lights repaired in corridor",
      "Electrical",
      "Library",
      "First floor · West corridor",
      "Confirmed",
      "Medium",
      "w1",
    ],
    [
      "Dripping pipe in the kitchen",
      "Plumbing",
      "Cafeteria",
      "Kitchen · Service entrance",
      "Assigned",
      "Medium",
      "w3",
    ],
  ];
  const now = new Date();
  return {
    workers,
    issues: rows.map((r, i) => {
      const at = new Date(
        now.getTime() - (i === 0 ? 2 : i * 9 + 4) * 3600000,
      ).toISOString();
      const history: Activity[] = [{ text: "Issue reported", at }];
      if (r[6])
        history.push({
          text: "Assigned to " + workers.find((w) => w.id === r[6])!.name,
          at,
        });
      if (r[4] === "In progress") history.push({ text: "Work started", at });
      if (["Resolved", "Confirmed"].includes(r[4]))
        history.push({ text: "Repair completed; awaiting confirmation", at });
      if (r[4] === "Confirmed")
        history.push({ text: "Reporter confirmed the repair", at });
      return {
        id: "CC-" + (1042 - i),
        title: r[0],
        category: r[1],
        zone: r[2],
        location: r[3],
        description:
          "Sample report for the hackathon demo. The issue is affecting people using this area and needs a maintenance visit.",
        status: r[4],
        priority: r[5],
        workerId: r[6],
        reporter: i % 3 === 0 ? "You" : ["Aarav Sharma", "Ananya Gupta"][i % 2],
        photo: null,
        completionPhoto: null,
        note: ["Resolved", "Confirmed"].includes(r[4])
          ? "Repair completed and the area checked."
          : "",
        createdAt: at,
        updatedAt: at,
        supporters: i % 3 === 0 ? ["demo-1", "demo-2"] : [],
        history,
      };
    }),
  };
}
