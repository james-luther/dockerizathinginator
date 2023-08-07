csvcut -c 1-8 Fluid-Attacks-Results.csv > 1.csv
csvcut -c 9 Fluid-Attacks-Results.csv > snippet.csv
csvcut -c 10 Fluid-Attacks-Results.csv > method.csv
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
csvjoin 1.csv snippet.csv method.csv 3.csv > output.csv
sed -i "1s/.*/Title,Cwe,Description,Cvss,Finding,Stream,Kind,Where,Snippet,Method,Date,Severity/" output.csv
