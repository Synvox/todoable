import { css, styled } from "~/util";

export const Button = styled.button(css`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: #007bff;
  color: white;
  cursor: pointer;
  transition-duration: 0.2s;
  font-size: 16px;
  text-shadow: 0px 1px 0px rgba(0, 0, 0, 0.2);
  &:active {
    transition-duration: 0s;
    translate: translateY(1px);
    background: #0056b3;
  }
`);
