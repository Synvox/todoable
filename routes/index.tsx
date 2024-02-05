import { css, js, type DataFunctionArgs } from "../util";

export default async function* (_ctx: DataFunctionArgs) {
  yield (
    <Document>
      <h1>Hello World</h1>
      <img src="serve.gif" alt="Serve" />
    </Document>
  );

  yield js(() => {
    console.log("Hello World");
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  yield css`
    body {
      background: white;
    }
  `;

  yield <div>I was streamed in</div>;
}

async function* Document({ children }: { children: any }) {
  yield (
    <html lang="en">
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <a href="/">Home</a>
        {children}
      </body>
    </html>
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  yield css`
    body {
      background: blue;
    }
  `;
}
