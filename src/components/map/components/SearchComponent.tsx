import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AutocompletePrediction } from '@/lib/types';

interface SearchComponentProps {
  searchValue: string;
  searchResults: AutocompletePrediction[];
  isSearching: boolean;
  showSearchResults: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isInputFocused: boolean;
  onSearchInput: (value: string) => void;
  onSearchResultSelect: (result: AutocompletePrediction) => void;
  onClearSearch: () => void;
  onManualSearch: () => void;
  onSetShowSearchResults: (show: boolean) => void;
  onSetIsInputFocused: (focused: boolean) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export default function SearchComponent({
  searchValue,
  searchResults,
  isSearching,
  showSearchResults,
  searchInputRef,
  isInputFocused,
  onSearchInput,
  onSearchResultSelect,
  onClearSearch,
  onSetShowSearchResults,
  onSetIsInputFocused,
  onKeyPress
}: SearchComponentProps) {
  const handleSearchContainerClick = () => {
    if (!isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
      const valueLength = searchInputRef.current.value.length;
      searchInputRef.current.setSelectionRange(valueLength, valueLength);
    }
  };

  return (
    <div className="relative search-input-container" onClick={handleSearchContainerClick}>
      <Popover open={showSearchResults} onOpenChange={onSetShowSearchResults}>
        <PopoverTrigger asChild>
          <div>
            <Input
              ref={searchInputRef}
              placeholder="Search locations..."
              className="pl-10 pr-10 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg w-80 h-12 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200"
              value={searchValue}
              onChange={(e) => {
                onSearchInput(e.target.value);
                if (e.target.value) {
                  onSetShowSearchResults(true);
                }
              }}
              onKeyDown={onKeyPress}
              onFocus={() => {
                onSetIsInputFocused(true);
                if (searchValue && searchResults.length > 0) {
                  onSetShowSearchResults(true);
                }
              }}
              onBlur={() => {
                onSetIsInputFocused(false);
                setTimeout(() => onSetShowSearchResults(false), 200);
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-80 bg-white/98 backdrop-blur-sm shadow-2xl border-2 border-gray-200 rounded-xl mt-2"
          align="start"
          onPointerDownOutside={(e) => {
            if (!(e.target as HTMLElement).closest('.search-input-container')) {
              onSetShowSearchResults(false);
            }
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-80 overflow-y-auto">
            {searchResults.length === 0 && searchValue && !isSearching ? (
              <div className="p-4 text-center text-gray-500">
                No results found for "{searchValue}"
              </div>
            ) : (
              searchResults.map((result, index) => (
                <div
                  key={`${result.placeId}-${index}`}
                  className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSearchResultSelect(result);
                    onSetShowSearchResults(false);
                  }}
                >
                  <div className="font-semibold text-gray-800 text-base mb-1">
                    {result.structuredFormatting.mainText}
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.structuredFormatting.secondaryText}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      {isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </div>
      )}
      {searchValue && !isSearching && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearSearch();
            searchInputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}