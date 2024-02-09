import { css } from "~/util";

export async function layout({ title }: { title: string }) {
  return async function* ({ children }: { children: any }) {
    yield (
      <html>
        <head>
          <title>{title}</title>
          <meta name="view-transition" content="same-origin" />
          {css`
            html {
              height: 100%;
            }
            body {
              font-family:
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Oxygen,
                Ubuntu,
                Cantarell,
                "Open Sans",
                "Helvetica Neue",
                sans-serif;
              height: 100%;
              margin: 0;
              font-size: 16px;
              color: #444;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
          `}
        </head>
        <body>{children}</body>
      </html>
    );
  };
}
