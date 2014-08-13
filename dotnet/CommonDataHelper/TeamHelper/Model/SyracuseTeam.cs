using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.SyracuseTeamHelper.Model
{
    public class SyracuseTeam
    {
        [JsonProperty("$uuid")]
        public String uuid;

        [JsonProperty("$value")]
        public String description;

        [JsonProperty("isPublic")]
        public Boolean isPublic;

        [JsonProperty("administrator")]
        public SyracuseTeamAdministrator administrator { get; set; }
    }
}
