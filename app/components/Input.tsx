import { css, styled } from "~/util";

export const Input = styled.input(
  css`
    padding: 10px 20px;
    border-radius: 5px;
    color: black;
    width: 100%;
    transition: background 0.2s;
    font-size: 16px;

    &:focus {
      background: white;
    }
    &.variant-border {
      background: #f8f8f8;
      border: 1px solid #f0f0f0;
    }
    &.variant-transparent {
      background: transparent;
      border: 1px solid transparent;
      &:focus {
        background: #f8f8f8;
        border: 1px solid #f0f0f0;
      }
    }
  `,
  {
    border: {
      border: "variant-border",
      transparent: "variant-transparent",
    },
  },
  {
    border: "border",
  }
);

export const InputLabel = styled.label(css`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  font-size: 16px;
  font-weight: 500;
  color: #444;
`);
