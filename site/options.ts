import * as rehypeDocument from "rehype-document";
import * as rehypeMeta from "rehype-meta";

export const sporesDocId = "11nWtOTEWcI_TEt8WE1vfS3_NsWLIDIK01ClhKDgmJiY";

export const sporesDocOpts: rehypeDocument.Options = {
  css: ["pico.classless.css", "spores.css"],
  language: "en",
  link: [
    {
      rel: "icon",
      href: "getty-images-0lwm492K9V8-unsplash-2.svg",
      type: "image/svg+xml",
    },
  ],
  responsive: true,
  title: "BG3 Mod: Glut's Circle of Animating Spores",
};

export const sporesMetaOpts: rehypeMeta.Options = {
  description:
    "Circle of the Spores Druids become master necromancers early in Baldur’s Gate 3. Use improved Animating Spores to command Spore Servants beyond the powers of Sovereign Glut.",
  image: {
    alt: "Spore Servants Andor and Mari flank a Duergar Druid in the Dank Crypt. Andor holds a torch overhead and Mari has a bow equipped.",
    height: "900",
    url: "https://circleofthespores.dev/duegar_andor_mari_1600_900_deta.png",
    width: "1600",
  },
  og: true,
  title: "BG3 Mod: Glut's Circle of Animating Spores",
  twitter: true,
  type: "article",
};
