using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PurposeHelper.Model
{
    public class PurposeModel
    {
        [JsonProperty("name")]
        public String name;

        [JsonProperty("$uuid")]
        public String uuid;
    }
}
