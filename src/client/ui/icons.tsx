import type { ReactElement } from 'react';

const I = ({ d, fill = false }: { d: string; fill?: boolean }): ReactElement => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const IconMenu = (): ReactElement => <I d="M4 6h16M4 12h16M4 18h16" />;
export const IconClose = (): ReactElement => <I d="M6 6l12 12M18 6L6 18" />;
export const IconPlus = (): ReactElement => <I d="M12 5v14M5 12h14" />;
export const IconMinus = (): ReactElement => <I d="M5 12h14" />;
export const IconSpin = (): ReactElement => <I d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />;
export const IconStop = (): ReactElement => <I d="M7 7h10v10H7z" fill />;
export const IconSkip = (): ReactElement => <I d="M5 5l8 7-8 7zM13 5l8 7-8 7z" fill />;
export const IconBolt = (): ReactElement => <I d="M13 2L4 14h7l-1 8 9-12h-7z" fill />;
export const IconAuto = (): ReactElement => <I d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />;
export const IconSound = (): ReactElement => <I d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />;
export const IconMute = (): ReactElement => <I d="M4 9v6h4l5 4V5L8 9zM16 9l5 6M21 9l-5 6" />;
export const IconInfo = (): ReactElement => <I d="M12 11v6M12 7.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />;
export const IconHistory = (): ReactElement => <I d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5M12 8v4.5l3 2" />;
export const IconGear = (): ReactElement => <I d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.500a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.400 2.300-1a7.6 7.6 0 0 0 2.600 1.500l.5 2.600h4l.5-2.600a7.600 7.600 0 0 0 2.600-1.500l2.300 1 2-3.400z" />;
export const IconTicket = (): ReactElement => <I d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 6v12" />;
export const IconPlay = (): ReactElement => <I d="M7 4l13 8-13 8z" fill />;
