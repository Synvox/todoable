import { css, styled } from "~/util";

export const Button = styled.button(
  css`
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition-duration: 0.2s;
    font-size: 16px;
    &:active {
      transition-duration: 0s;
      translate: translateY(1px);
      background: #0056b3;
    }
    &.variant-primary {
      background: #007bff;
      color: white;
      text-shadow: 0px 1px 0px rgba(0, 0, 0, 0.2);
      &:active {
        background: #0056b3;
      }
    }
    &.variant-secondary {
      background: white;
      color: #444;
      &:hover {
        background: #f0f0f0;
      }
      &:active {
        background: #e0e0e0;
      }
    }
  `,
  {
    variant: {
      primary: "variant-primary",
      secondary: "variant-secondary",
    },
  },
  {
    variant: "primary",
  }
);
