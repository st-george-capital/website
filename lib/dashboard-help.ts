export type DashboardHelpTopicId = 'members' | 'marketing' | 'content' | 'permissions';

export interface DashboardHelpTopic {
  id: DashboardHelpTopicId;
  label: string;
  title: string;
  summary: string;
  steps: Array<{ title: string; detail: string }>;
  href: string;
  linkLabel: string;
}

export const DASHBOARD_HELP_TOPICS: DashboardHelpTopic[] = [
  {
    id: 'members',
    label: 'Members',
    title: 'Add and publish a team member',
    summary: 'Keep the public team directory accurate without mixing it up with account permissions.',
    steps: [
      { title: 'Open Team', detail: 'Use Team in the dashboard navigation, then choose Add Member.' },
      { title: 'Add the public profile', detail: 'Enter the member’s name, title, division, program, graduation year, bio, LinkedIn link, and headshot.' },
      { title: 'Check ordering and alumni status', detail: 'Use the member order for display priority and archive former members as alumni instead of deleting their history.' },
      { title: 'Manage access separately', detail: 'A team profile does not grant dashboard access. Use Users to invite or change a person’s visitor, user, or admin role.' },
    ],
    href: '/dashboard/team',
    linkLabel: 'Open Team',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    title: 'Generate a marketing package',
    summary: 'Turn approved SGC content into coordinated social creative, captions, and downloadable assets.',
    steps: [
      { title: 'Choose the source', detail: 'Start from a job posting, article, research report, strategy document, or a manual announcement.' },
      { title: 'Set the campaign angle', detail: 'Select the campaign type and review the headline, supporting copy, CTA, and destination before generation.' },
      { title: 'Generate and review', detail: 'Create the asset pack, check the preview for accuracy and brand fit, then revise the override fields if needed.' },
      { title: 'Download the final pack', detail: 'Export the approved images and caption pack for scheduling. Do not publish draft data or unapproved research claims.' },
    ],
    href: '/dashboard/tools/marketing',
    linkLabel: 'Open Marketing Studio',
  },
  {
    id: 'content',
    label: 'Content',
    title: 'Publish research and website content',
    summary: 'Use the correct workspace so public material, internal research, and strategy documents stay organized.',
    steps: [
      { title: 'Create the right record', detail: 'Use Articles for public commentary, Research for equity research reports, and Strategy for internal frameworks or long-form documents.' },
      { title: 'Add a clear cover and summary', detail: 'Use an accurate title, a concise overview, and a properly sized cover image so readers can understand the item before opening it.' },
      { title: 'Review before publishing', detail: 'Confirm the author, dates, access level, disclaimers, and all external links before making an item public.' },
      { title: 'Promote from Marketing Studio', detail: 'Once published, select the final item as a Marketing Studio source to build the social package.' },
    ],
    href: '/dashboard/research',
    linkLabel: 'Open Research',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    title: 'Manage dashboard access safely',
    summary: 'Roles protect internal research while keeping basic member onboarding simple.',
    steps: [
      { title: 'Visitor', detail: 'Use for people who should not access member-only research tools or protected dashboard data.' },
      { title: 'User', detail: 'Use for active members who need standard dashboard and research-tool access.' },
      { title: 'Admin', detail: 'Use sparingly for people who manage users, content, settings, and operational workflows.' },
      { title: 'Review access regularly', detail: 'Update graduating members and remove unnecessary admin access as roles change.' },
    ],
    href: '/dashboard/users',
    linkLabel: 'Open Users',
  },
];

export function getDashboardHelpTopic(id: DashboardHelpTopicId) {
  return DASHBOARD_HELP_TOPICS.find((topic) => topic.id === id) ?? DASHBOARD_HELP_TOPICS[0];
}
