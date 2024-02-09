import { css, styled } from "~/util";

export const Alert = styled.div(
  css`
    padding: 14px 20px;
    border-radius: 5px;
    font-size: 16px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    &.alert-notice {
      background: #e6f4ea;
      color: #155724;
    }
    &.alert-error {
      background: #fceaeb;
      color: #721c24;
    }
  `,
  {
    type: {
      notice: "alert-notice",
      error: "alert-error",
    },
  },
  {
    type: "notice",
  }
);
