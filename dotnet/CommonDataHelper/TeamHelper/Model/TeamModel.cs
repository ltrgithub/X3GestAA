using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.SyracuseTeamHelper.Model
{
    public class TeamModel
    {
        [JsonProperty("$value")]
        public String description;
    }
}
