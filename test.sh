for i in $(csvcut -c 4 Fluid-Attacks-Results.csv | cut -d ":" -f2 | cut -d "/" -f1); do
  if awk "BEGIN {exit !($i < 4.0)}"; then
    echo "$now,Low" >> 3.csv;
  elif awk "BEGIN {exit !($i < 7.0)}"; then
    echo "$now,Medium" >> 3.csv;
  elif awk "BEGIN {exit !($i < 9.0)}"; then
    echo "$now, High" >> 3.csv;
  elif awk "BEGIN {exit !($i > 9.0)}"; then
    echo "$now,Critical" >> 3.csv;
  fi
done
