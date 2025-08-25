import { Search, Navigation, Layers, MapIcon, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ControlsComponentProps {
  mapType: string;
  showTraffic: boolean;
  showTransit: boolean;
  searchValue: string;
  isSearching: boolean;
  onMapTypeChange: (type: string) => void;
  onTrafficToggle: () => void;
  onTransitToggle: () => void;
  onManualSearch: () => void;
  onGetCurrentLocation: () => void;
}

export default function ControlsComponent({
  mapType,
  showTraffic,
  showTransit,
  searchValue,
  isSearching,
  onMapTypeChange,
  onTrafficToggle,
  onTransitToggle,
  onManualSearch,
  onGetCurrentLocation
}: ControlsComponentProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="icon"
        className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12 transition-all duration-200"
        onClick={() => {
          if (searchValue.trim()) {
            onManualSearch();
          }
        }}
        disabled={!searchValue.trim() || isSearching}
      >
        <Search className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12 transition-all duration-200"
        onClick={onGetCurrentLocation}
      >
        <Navigation className="h-5 w-5" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12 transition-all duration-200"
          >
            <Layers className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 bg-white/98 backdrop-blur-sm shadow-2xl border-2 border-gray-200 rounded-xl p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Map Type
              </label>
              <ToggleGroup
                type="single"
                value={mapType}
                onValueChange={onMapTypeChange}
                className="grid grid-cols-2 gap-1"
              >
                <ToggleGroupItem value="roadmap" size="sm" className="text-xs">
                  <MapIcon className="h-4 w-4 mr-1" />
                  Road
                </ToggleGroupItem>
                <ToggleGroupItem value="satellite" size="sm" className="text-xs">
                  <Satellite className="h-4 w-4 mr-1" />
                  Satellite
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">Layers</label>
              <div className="flex flex-col gap-2">
                <Button
                  variant={showTraffic ? 'default' : 'outline'}
                  size="sm"
                  onClick={onTrafficToggle}
                  className="justify-start text-xs"
                >
                  🚦 Traffic
                </Button>
                <Button
                  variant={showTransit ? 'default' : 'outline'}
                  size="sm"
                  onClick={onTransitToggle}
                  className="justify-start text-xs"
                >
                  🚇 Transit
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}