using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.LegislationHelper.Model
{
    public class LegislationsModel
    {
        [JsonProperty("$resources")]
        public List<LegislationModel> legislations { get; set; }
    }
}
