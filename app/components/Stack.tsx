import { css, styled } from "~/util";

export const Stack = styled.div(
  css`
    display: flex;
    flex-direction: column;
    &.gap-1 {
      gap: 0.25rem;
    }
    &.gap-2 {
      gap: 0.5rem;
    }
    &.gap-3 {
      gap: 1rem;
    }
    &.gap-4 {
      gap: 2rem;
    }
    &.gap-5 {
      gap: 4rem;
    }
  `,
  {
    gap: {
      xs: "gap-1",
      sm: "gap-2",
      m: "gap-3",
      lg: "gap-4",
      xl: "gap-5",
    },
  },
  {
    gap: "m",
  }
);
