import React from 'react';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';

export const GLOSSARY_COLORS = {
  glossary: '#022FCD',
  category: '#34A853',
  term: '#F9AB00',
} as const;


type GlossaryType = 'glossary' | 'category' | 'term';


const GLOSSARY_SYMBOL = 'book_2';

const MaterialSymbolIcon: React.FC<{ name: string; size: string; color: string; style?: React.CSSProperties }> = ({
  name, size, color, style,
}) => (
  <span
    className="material-symbols-outlined"
    style={{
      fontSize: size,
      color,
      flex: '0 0 auto',
      lineHeight: 1,
      ...style,
    }}
  >
    {name}
  </span>
);

export const getGlossaryMuiIcon = (
  type: GlossaryType,
  options?: { size?: string; color?: string; style?: React.CSSProperties }
): React.ReactElement => {
  const color = options?.color ?? GLOSSARY_COLORS[type];
  const size = options?.size ?? '1rem';

  if (type === 'glossary') {
    return <MaterialSymbolIcon name={GLOSSARY_SYMBOL} size={size} color={color} style={options?.style} />;
  }

  const Icon = type === 'category' ? CategoryOutlined : ArticleOutlined;
  return (
    <Icon
      sx={{
        color,
        fontSize: size,
        flex: '0 0 auto',
        ...options?.style,
      }}
    />
  );
};

export const isGlossaryAssetType = (assetName: string): boolean => {
  const n = assetName?.toLowerCase().replace(/[\s_-]/g, '') ?? '';
  return (
    n === 'glossary' || n === 'glossaries' ||
    n === 'glossarycategory' || n === 'glossarycategories' ||
    n === 'category' || n === 'categories' ||
    n === 'glossaryterm' || n === 'glossaryterms' ||
    n === 'term' || n === 'terms'
  );
};

export const assetNameToGlossaryType = (assetName: string): GlossaryType => {
  const n = assetName?.toLowerCase().replace(/[\s_-]/g, '') ?? '';
  if (n.includes('categor')) return 'category';
  if (n.includes('term')) return 'term';
  return 'glossary';
};
