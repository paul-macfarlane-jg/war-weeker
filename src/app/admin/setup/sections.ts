/**
 * The `/admin/setup` sections. A section with no `href` isn't built yet and
 * shows as "Soon"; tickets 26 and 27 add their pages and set it.
 */
export const SETUP_SECTIONS: {
  label: string;
  description: string;
  href: string | null;
}[] = [
  {
    label: "War Week",
    description:
      "Story Theme, dates, status, mode, labels, links, organizers and the Appearance Theme.",
    href: "/admin/setup/war-week",
  },
  {
    label: "Days",
    description: "The War Week's Days and their Day Themes.",
    href: "/admin/setup/days",
  },
  {
    label: "Teams & roster",
    description: "Teams, Participants and Leaders.",
    href: null,
  },
  {
    label: "Competitions",
    description: "Competitions, scoring and Placement Points.",
    href: null,
  },
  {
    label: "Schedule",
    description: "Schedule Items for each Day.",
    href: "/admin/setup/schedule",
  },
  {
    label: "FAQ",
    description: "FAQ Items and their order.",
    href: "/admin/setup/faq",
  },
];
