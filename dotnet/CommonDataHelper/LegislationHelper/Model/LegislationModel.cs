using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.LegislationHelper.Model
{
    public class LegislationModel
    {
        [JsonProperty("LNGDES")]
        public String description;

        [JsonProperty("CODE")]
        public String code;
    }
}
