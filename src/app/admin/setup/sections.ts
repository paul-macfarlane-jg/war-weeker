/**
 * The `/admin/setup` sections. A section with no `href` isn't built yet and
 * shows as "Soon"; ticket 27 adds its pages and sets it.
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
    href: "/admin/setup/teams",
  },
  {
    label: "Competitions",
    description: "Competitions, scoring and Placement Points.",
    href: "/admin/setup/competitions",
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
