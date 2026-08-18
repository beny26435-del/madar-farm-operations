import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { colors } from "@/constants/colors";
import { faNumber } from "@/lib/format";
import { gregorianToJalali, jalaliToGregorian, parseJalaliDate } from "@/lib/jalali";

const months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const weekdays = ["ش","ی","د","س","چ","پ","ج"];
export type JalaliValue = { year: number; month: number; day: number } | null;

export function JalaliPicker({ value, onChange }: { value: JalaliValue; onChange: (value: NonNullable<JalaliValue>) => void }) {
  const today = useMemo(() => { const now = new Date(); return gregorianToJalali(now.getFullYear(), now.getMonth()+1, now.getDate()); }, []);
  const [open, setOpen] = useState(false); const [year, setYear] = useState(value?.year ?? today.year); const [month, setMonth] = useState(value?.month ?? today.month);
  const first = jalaliToGregorian(year, month, 1); const offset = (new Date(first.year, first.month-1, first.day).getDay()+1)%7; const count = month <= 6 ? 31 : month <= 11 ? 30 : parseJalaliDate(String(year),"12","30") ? 30 : 29;
  const cells: Array<number|null> = [...Array.from({length:offset},()=>null), ...Array.from({length:count},(_,i)=>i+1)];
  function move(direction: -1|1) { const next = month + direction; if (next < 1) { setMonth(12); setYear((v)=>v-1); } else if (next > 12) { setMonth(1); setYear((v)=>v+1); } else setMonth(next); }
  const label = value ? `${faNumber(value.day)} ${months[value.month-1]} ${faNumber(value.year)}` : "انتخاب تاریخ";
  return <><Pressable style={styles.trigger} onPress={()=>setOpen(true)}><Ionicons name="calendar-outline" size={21} color={colors.primary}/><Text style={styles.triggerText}>{label}</Text><Ionicons name="chevron-back" size={18} color={colors.muted}/></Pressable><Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><Pressable style={styles.overlay} onPress={()=>setOpen(false)}><Pressable style={styles.panel} onPress={()=>undefined}><View style={styles.head}><Pressable onPress={()=>move(-1)}><Ionicons name="chevron-forward" size={24}/></Pressable><Text style={styles.month}>{months[month-1]} {faNumber(year)}</Text><Pressable onPress={()=>move(1)}><Ionicons name="chevron-back" size={24}/></Pressable></View><View style={styles.grid}>{weekdays.map((day)=><Text key={day} style={styles.weekday}>{day}</Text>)}{cells.map((day,index)=>day ? <Pressable key={`${year}-${month}-${day}`} style={[styles.day,value?.year===year&&value.month===month&&value.day===day&&styles.selected,today.year===year&&today.month===month&&today.day===day&&styles.today]} onPress={()=>{onChange({year,month,day});setOpen(false);}}><Text style={value?.year===year&&value.month===month&&value.day===day&&styles.selectedText}>{faNumber(day)}</Text></Pressable>:<View key={`empty-${index}`} />)}</View><View style={styles.footer}><Pressable onPress={()=>{onChange(today);setOpen(false);}}><Text>امروز</Text></Pressable><Pressable onPress={()=>setOpen(false)}><Text>بستن</Text></Pressable></View></Pressable></Pressable></Modal></>;
}

const styles=StyleSheet.create({trigger:{minHeight:54,borderWidth:1,borderColor:colors.border,borderRadius:15,backgroundColor:"#FCFDFC",paddingHorizontal:14,flexDirection:"row-reverse",alignItems:"center",gap:10},triggerText:{flex:1,textAlign:"right",fontWeight:"700",color:colors.text},overlay:{flex:1,backgroundColor:"rgba(10,20,15,.46)",justifyContent:"center",padding:20},panel:{backgroundColor:colors.surface,borderRadius:24,padding:18,gap:14},head:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center"},month:{fontWeight:"900",fontSize:17,color:colors.text},grid:{display:"flex",flexDirection:"row-reverse",flexWrap:"wrap"},weekday:{width:"14.285%",textAlign:"center",paddingVertical:8,color:colors.muted,fontWeight:"800"},day:{width:"14.285%",aspectRatio:1,alignItems:"center",justifyContent:"center",borderRadius:12},selected:{backgroundColor:colors.primary},selectedText:{color:"#fff",fontWeight:"900"},today:{borderWidth:1,borderColor:colors.accent},footer:{flexDirection:"row-reverse",justifyContent:"space-between",borderTopWidth:1,borderTopColor:colors.border,paddingTop:14}});
