import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

export interface PickupSlot {
  active: boolean;
  start: string;
  end: string;
}

export type PickupSlots = Record<string, PickupSlot>;

const DEFAULT_PICKUP_SLOTS: PickupSlots = {
  mon: { active: false, start: "17:00", end: "20:00" },
  tue: { active: false, start: "17:00", end: "20:00" },
  wed: { active: false, start: "17:00", end: "20:00" },
  thu: { active: false, start: "17:00", end: "20:00" },
  fri: { active: false, start: "17:00", end: "20:00" },
  sat: { active: false, start: "17:00", end: "20:00" },
  sun: { active: false, start: "17:00", end: "20:00" },
};

const DAY_LABELS: Record<string, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Generate time options with 30min step
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

interface PickupSettingsSectionProps {
  pickupSlots: PickupSlots;
  onPickupSlotsChange: (slots: PickupSlots) => void;
  maxOrdersPerDay: number;
  onMaxOrdersChange: (val: number) => void;
  busyDates: Date[];
  onBusyDatesChange: (dates: Date[]) => void;
  vacationDates: Date[];
  onVacationDatesChange: (dates: Date[]) => void;
}

export { DEFAULT_PICKUP_SLOTS };

export default function PickupSettingsSection({
  pickupSlots,
  onPickupSlotsChange,
  maxOrdersPerDay,
  onMaxOrdersChange,
  busyDates,
  onBusyDatesChange,
  vacationDates,
  onVacationDatesChange,
}: PickupSettingsSectionProps) {
  const updateSlot = (day: string, field: keyof PickupSlot, value: boolean | string) => {
    onPickupSlotsChange({
      ...pickupSlots,
      [day]: { ...pickupSlots[day], [field]: value },
    });
  };

  return (
    <div className="pt-4 border-t border-border space-y-6">
      <h3 className="font-medium text-foreground">График работы и выдачи заказов</h3>

      {/* Schedule */}
      <div className="space-y-3">
        <div className="space-y-2">
          {DAY_ORDER.map((day) => {
            const slot = pickupSlots[day] || DEFAULT_PICKUP_SLOTS[day];
            return (
              <div key={day} className="flex items-center gap-2">
                <label className="flex items-center gap-2 w-20 cursor-pointer min-h-[44px]">
                  <Checkbox
                    checked={slot.active}
                    onCheckedChange={(checked) => updateSlot(day, "active", !!checked)}
                  />
                  <span className="text-sm text-foreground">{DAY_LABELS[day]}</span>
                </label>
                <Select
                  value={slot.start}
                  onValueChange={(v) => updateSlot(day, "start", v)}
                  disabled={!slot.active}
                >
                  <SelectTrigger className="w-28 h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">—</span>
                <Select
                  value={slot.end}
                  onValueChange={(v) => updateSlot(day, "end", v)}
                  disabled={!slot.active}
                >
                  <SelectTrigger className="w-28 h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Укажите ваше личное рабочее время. Заказы будут планироваться так, чтобы время приготовления начиналось в момент открытия вашего окна.
        </p>
      </div>

      {/* Max orders per day */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Макс. заказов в день</Label>
        <Input
          type="number"
          min={1}
          value={maxOrdersPerDay}
          onChange={(e) => onMaxOrdersChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Сколько заказов вы готовы взять на одну дату. При достижении лимита дата станет недоступна для новых клиентов.
        </p>
      </div>

      {/* Exclusion dates */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">🚫 Я занят (Стоп-заказы)</Label>
          <Calendar
            mode="multiple"
            selected={busyDates}
            onSelect={(dates) => onBusyDatesChange(dates || [])}
            className="rounded-md border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">🏖️ Отпуск (Магазин закрыт)</Label>
          <Calendar
            mode="multiple"
            selected={vacationDates}
            onSelect={(dates) => onVacationDatesChange(dates || [])}
            className="rounded-md border"
          />
        </div>
      </div>
    </div>
  );
}
