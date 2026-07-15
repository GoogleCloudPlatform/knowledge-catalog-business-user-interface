// glossaryUIHelpers.tsx
import { type ItemType } from "./GlossaryDataType";
import { getGlossaryMuiIcon, GLOSSARY_COLORS } from "../../constants/glossaryIcons";

export const getIcon = (
  type: ItemType,
  fontSize: "small" | "medium" | "large" = "small",
  color?: string
) => {
  const sizeMap = {
    small: "1rem",
    medium: "1.5rem",
    large: "2.5rem",
  };

  const size = sizeMap[fontSize];
  const glossaryType = type === "glossary" || type === "category" || type === "term" ? type : "term";

  return getGlossaryMuiIcon(glossaryType, {
    size,
    color: color || GLOSSARY_COLORS[glossaryType],
  });
};
