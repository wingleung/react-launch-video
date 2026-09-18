export type Status = "Todo" | "In progress" | "Done";

export interface Issue {
  id: string;
  title: string;
  status: Status;
  team: "web" | "platform" | "mobile";
  assignee: string;
}

/** Bundled sample data. The real app would load this from the API. */
export const ISSUES: Issue[] = [
  { id: "REL-104", title: "Search results jump when typing fast", status: "In progress", team: "web", assignee: "Ana" },
  { id: "REL-109", title: "Dark mode for the settings page", status: "Todo", team: "web", assignee: "Tom" },
  { id: "REL-112", title: "Retry failed webhook deliveries", status: "Todo", team: "platform", assignee: "Ines" },
  { id: "REL-115", title: "Offline drafts on Android", status: "In progress", team: "mobile", assignee: "Sam" },
  { id: "REL-118", title: "Keyboard shortcut cheat sheet", status: "Done", team: "web", assignee: "Ana" },
  { id: "REL-121", title: "Rate limit the public API", status: "In progress", team: "platform", assignee: "Kofi" },
  { id: "REL-124", title: "Empty state for new projects", status: "Todo", team: "web", assignee: "Lea" },
  { id: "REL-127", title: "Push notifications for mentions", status: "Todo", team: "mobile", assignee: "Sam" },
];

export const MY_TEAM = "web";
