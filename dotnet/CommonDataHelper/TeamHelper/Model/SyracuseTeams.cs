using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.SyracuseTeamHelper.Model
{
    public class SyracuseTeams
    {
        [JsonProperty("$url")]
        public String url;

        [JsonProperty("$descriptor")]
        public String descriptor;

        [JsonProperty("$resources")]
        public List<SyracuseTeam> teams { get; set; }
    }
}
