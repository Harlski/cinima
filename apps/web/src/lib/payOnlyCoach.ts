export type PayOnlyCoachGlow = "alreadyInstalled" | "getNimiqPay";

export type PayOnlyCoachState = {
  glow: PayOnlyCoachGlow;
  showFullAccessTooltip: boolean;
  showLearnPayTooltip: boolean;
};

export function initialPayOnlyCoachState(): PayOnlyCoachState {
  return {
    glow: "alreadyInstalled",
    showFullAccessTooltip: false,
    showLearnPayTooltip: false,
  };
}

export function shouldInterceptAlreadyInstalledClick(opts: {
  coachEnabled: boolean;
  isDesktop: boolean;
}): boolean {
  return opts.coachEnabled && opts.isDesktop;
}

export function afterDesktopAlreadyInstalledClick(
  _state: PayOnlyCoachState
): PayOnlyCoachState {
  return {
    glow: "getNimiqPay",
    showFullAccessTooltip: true,
    showLearnPayTooltip: true,
  };
}
