using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PurposeHelper.Model
{
    public class PurposesModel
    {
        [JsonProperty("$resources")]
        public List<PurposeModel> purposes { get; set; }
    }
}
