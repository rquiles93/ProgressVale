function privateIpv4(hostname) {
  const octets = hostname.split(".").map(Number);
  return (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
    (octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168))
  );
}

export function nextDevelopmentOrigins(raw) {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      if (entry.includes("://") || entry.includes("/") || entry.includes("*") || entry.includes("?")) return [];
      const hostname = entry.split(":")[0];
      return privateIpv4(hostname) ? [hostname] : [];
    });
}
