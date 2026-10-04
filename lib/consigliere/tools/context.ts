/** The signed-in member a tool call runs for; tools that touch per-member data must scope to it. */
export interface ToolContext {
  userId: string;
  role: string;
}
