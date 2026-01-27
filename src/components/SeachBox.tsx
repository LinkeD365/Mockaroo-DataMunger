import { observer } from "mobx-react";
import * as React from "react";

import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import { Field, Label, SearchBox, tokens } from "@fluentui/react-components";
import { ConfigColumn, SelectionValue } from "../model/Config";
import { utlLib } from "../utils/utils";

type SearchBoxProps = {
  dvSvc: dvService;
  vm: ViewModel;
  utils: utlLib;
  selected?: string;
  column: ConfigColumn;
  updateSelected: (owner: SelectionValue) => void;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
};

function useDebounce(cb: string, delay: number) {
  const [debounceValue, setDebounceValue] = React.useState(cb);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebounceValue(cb);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [cb, delay]);
  return debounceValue;
}

export const SearchBoxCtl = observer((props: SearchBoxProps): React.JSX.Element => {
  const { dvSvc, vm, utils, column, onLog } = props;

  const [query, setQuery] = React.useState("");
  const [loadingText, setLoadingText] = React.useState("Loading...");

  const [results, setResults] = React.useState<SelectionValue[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const debounceValue = useDebounce(query, 300);

  React.useEffect(() => {
    if (query && query.length >= 1) {
      onLog(`Debounced search query: ${query}`, "info");
      searchOwners(query);
    }
  }, [debounceValue]);

  const searchOwners = async (searchQuery: string) => {
    onLog(`Searching for owners with query: ${searchQuery}`, "info");
    setQuery(searchQuery);
    setIsLoading(true);
    setLoadingText("Searching...");

    if (searchQuery.length < 1) {
      setIsLoading(false);
      setResults([]);
      return;
    }

    await dvSvc
      .getLookupValues(
        column.parentTable?.setName || "",
        column.parentTable?.primaryNameColumn || "",
        column.parentTable?.primaryIdColumn || "",
        searchQuery,
      )
      .then((response) => {
        if (response.length === 0) {
          setLoadingText("No results found");
        } else {
          setIsLoading(false);
          setResults(response);
        }
        // if (response.filter((item) => vm.coOwners.every((coOwner) => coOwner.id !== item.id)).length === 0) {
        //   setLoadingText("No results found");
        // } else {
        //   setIsLoading(false);
        //   setResults(response.filter((item) => vm.coOwners.every((coOwner) => coOwner.id !== item.id)));
        // }
      })
      .catch((error) => {
        utils.alert("Error", `Error searching owners: ${error.message || error}`);
        setIsLoading(false);
      });
  };

  const handleSelectItem = (id: string, name: string) => {
    setSelectedItem(id);
    setQuery("");
    setResults([]);
    setIsLoading(false);
    props.updateSelected(new SelectionValue(name, id));
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Field label={`Add ${column.parentTable?.label || "item"}`}>
        <SearchBox placeholder="Search..." value={query} onChange={(_, data) => setQuery(data.value)} />
      </Field>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: tokens.colorNeutralBackground1,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
            borderRadius: "4px",
            zIndex: 1000,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            padding: "8px",
          }}
        >
          {loadingText || "Loading..."}
        </div>
      )}

      {results.length > 0 && query.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: tokens.colorNeutralBackground1,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
            borderRadius: "4px",
            zIndex: 1000,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          {results.map((item) => (
            <Label
              key={item.value}
              onClick={() => handleSelectItem(item.value, item.label)}
              style={{
                cursor: "pointer",
                backgroundColor:
                  selectedItem === item.value ? tokens.colorNeutralBackground1Hover : tokens.colorNeutralBackground1,
                display: "flex",
                alignItems: "center",
                padding: "8px",
              }}
            >
              {/* {item.type === "user" ? <Person12Filled /> : <PeopleTeam16Filled />}{" "} */}
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
            </Label>
          ))}
        </div>
      )}
    </div>
  );
});
