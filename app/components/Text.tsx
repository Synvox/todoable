import { css, styled } from "~/util";

export const H1 = styled.h1(css`
  font-size: 2rem;
  margin: 0;
  color: #444;
`);

export const HGroup = styled.hgroup(css`
  font-weight: 500;
  color: #444;
  & > p {
    color: #444444cc;
    font-size: 1.1rem;
  }
`);

export const Label = styled.label(css`
  font-size: 16px;
  font-weight: 500;
  color: #444;
`);
