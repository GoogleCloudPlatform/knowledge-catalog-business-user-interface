import FilterTag from "../Tags/FilterTag";

/**
 * @file FilterChips.tsx
 * @summary Renders a list of styled "chips" for currently active filters.
 *
 * @description
 * This component takes an array of `selectedFilters` and renders a `<FilterTag>`
 * component (a "chip") for each filter that has a `type` of "typeAliases" or
 * "system".
 *
 * For each rendered chip, it dynamically creates a label by calling the `getCount`
 * prop to fetch the number of results for that filter (e.g., "BigQuery (5)").
 *
 * Each chip includes a close (x) button. When clicked, it invokes the
 * `handleRemoveFilterTag` callback, passing the filter object to be removed.
 *
 * @param {object} props - The props for the FilterChips component.
 * @param {any[]} props.selectedFilters - An array of active filter objects
 * to be displayed.
 * @param {(filters: any) => number | undefined} props.getCount - A callback
 * function that takes a filter object and returns its associated result count.
 * @param {(filters: any[]) => void} props.handleRemoveFilterTag - A callback
 * function that is triggered when a chip's close icon is clicked,
 * passing the filter object to be removed.
 *
 * @returns {JSX.Element} A React fragment containing the list of
 * rendered `<FilterTag>` components.
 */

interface FilterChipsProps {
  selectedFilters:any[];
  getCount: (filters: any) => string | undefined;
  handleRemoveFilterTag: (filters: any[]) => void;
};
const FilterChips:React.FC<FilterChipsProps> = ({selectedFilters, getCount, handleRemoveFilterTag}) =>{
  return (
    <>
    {
      selectedFilters && selectedFilters.length > 0 && selectedFilters.map((f: any) => {
        console.log(f);
        const c = getCount(f);
        const label = c === undefined ? `${f.name}` : `${f.name} (${c})`;
        return (f.type === "typeAliases" || f.type === "system") ? (
        <FilterTag
          key={`sel-${f.type}-${f.name}`}
          handleClick={() => {}}
          handleClose={() => handleRemoveFilterTag(f)}
          showCloseButton={true}
          css={{
            margin: "0px",
            textTransform: "capitalize",
            fontFamily: '"Google Sans Text", sans-serif',
            fontWeight: 400,
            fontSize: '0.75rem',
            lineHeight: '1.33em',
            letterSpacing: '0.83%',
            padding: '8px 13px',
            borderRadius: '59px',
            gap: '8px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#E7F0FE',
            color: '#022FCD',
            height: '32px',
            border: 'none',
            whiteSpace: 'nowrap'      
          }}
          text={label}
        />
        ) : (<></>);
      })
    }
  </>);
};

export default FilterChips;