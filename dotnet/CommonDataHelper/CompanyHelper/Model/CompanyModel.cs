using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.CompanyHelper.Model
{
    public class CompanyModel
    {
        [JsonProperty("LIBACT")]
        public String description;

        [JsonProperty("$uuid")]
        public String uuid;
    }
}
